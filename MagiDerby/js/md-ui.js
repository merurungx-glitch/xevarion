/* ============================================================
   MagiDerby — 画面（★★ 2026-10-21 実際の GⅠ 用）
   ------------------------------------------------------------
   ・タブ：GⅠ（今年の24レース・次のレース）／馬券（買った馬券・収支）／データ（今年の GⅠ の傾向）
   ・レースを開くと：出馬表・馬柱・オッズ・コース・結果（★★ 2026-10-26 ご指定「結果で再現は要りません」で再現は外した）
   ・馬券：単勝〜3連単 × 通常・ボックス・ながし・フォーメーション。締切は発走の2分前（サーバーの時刻で判定）
   ============================================================ */
(function () {
  "use strict";
  const D = window.MD_DATA, N = window.MD_NET, B = window.MD_BET, RC = window.MD_RACE;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("ja-JP");
  const now = () => B.clock.now();
  const U = { tab: "home", idx: null, err: "", rid: null, race: null, ex: null, rtab: "card", otype: "win", oaxis: 0, player: null, slip: null, tkf: "all", tkr: "", tkt: "", tks: "new", resAll: {}, data: null, lastSt: "" };
  try { const t = sessionStorage.getItem("md_tab"); if (t === "home" || t === "tickets" || t === "data") U.tab = t; } catch (e) {}

  /* ══════════ 小物 ══════════ */
  const wk = (w) => D.WAKU[(w || 1) - 1] || D.WAKU[0];
  const wakuChip = (w, txt) => { const c = wk(w); return '<i class="wk" style="background:' + c.bg + ";color:" + c.ink + ";border-color:" + c.line + '">' + esc(txt == null ? w || "" : txt) + "</i>"; };
  const noChip = (no, w) => { const c = wk(w); return '<b class="no" style="background:' + c.bg + ";color:" + c.ink + ";border-color:" + c.line + '">' + esc(no || "–") + "</b>"; };
  const posCls = (p) => { const n = N.posNum(p); return n === 1 ? "p1" : n === 2 ? "p2" : n === 3 ? "p3" : n <= 5 ? "p5" : n === 99 ? "px" : ""; };
  const yen = (y) => fmt(y);
  /* 着差 "1.1/4" → "1 1/4"（netkeiba の書き方を JRA の書き方に） */
  const mgStr = (m) => String(m || "").replace(/^(\d+)\.(\d\/\d)$/, "$1 $2");
  function toast(msg, kind) {
    const t = document.createElement("div"); t.className = "toast " + (kind || ""); t.innerHTML = msg;
    $("#toasts").appendChild(t); setTimeout(() => t.classList.add("out"), 2600); setTimeout(() => t.remove(), 3200);
  }
  function raceOf(rid) { return ((U.idx && U.idx.races) || []).find((r) => r.rid === rid) || null; }
  function shortNm(r) { return D.shortName(r.nm); }
  function surfCls(r) { return r && r.surf === "ダ" ? "dirt" : "turf"; }
  function courseStr(r) { return esc(r.place) + " " + esc(r.surf || "") + esc(r.dist || "") + "m"; }
  function prizeStr(p) { if (!p || !p[0]) return ""; const v = p[0]; return v >= 10000 ? (v / 10000).toFixed(v % 10000 ? 1 : 0).replace(/\.0$/, "") + "億円" : fmt(v) + "万円"; }
  function agoStr(ms) { const m = Math.max(0, Math.round((Date.now() - ms) / 60000)); return m < 1 ? "たった今" : m < 60 ? m + "分前" : m < 1440 ? Math.floor(m / 60) + "時間前" : Math.floor(m / 1440) + "日前"; }

  /* ══════════ ヘッダー ══════════ */
  function paintHead() {
    const x = $("#hdXeva"); if (x) { let b = 0; try { b = window.XEVA ? window.XEVA.getBalance() : 0; } catch (e) {} x.textContent = fmt(b); }
    const c = $("#hdClock"); if (c) c.textContent = N.hms(now());
    const d = $("#hdSync"); if (d) d.classList.toggle("ok", B.clock.ok());
    const o = $("#offBar"); if (o) o.hidden = N.online !== false;
  }

  /* ══════════ GⅠ（ホーム） ══════════ */
  function loadingHTML(err) {
    if (err) return '<div class="empty"><b>データを読めませんでした</b><p>' + esc(err) + '</p><p class="sm">実際の GⅠ の情報は、XEVARION の PC の自動取得（1時間ごと）が置いたものを読んでいます。少し待ってからもう一度開いてください。</p><button class="btn" data-a="reload">↻ もう一度読む</button></div>';
    return '<div class="empty"><div class="spin"></div><b>今年の GⅠ を読みこんでいます…</b></div>';
  }
  function statusChip(st) { return '<span class="chip st-' + st + '">' + esc(N.STATUS[st] || "") + "</span>"; }
  function cdBlock(r, st) {
    const t = now();
    if (st === "sale") return '<div class="cd"><span>締切まで</span><b data-cd="' + N.closeAt(r) + '">' + N.left(N.closeAt(r) - t) + '</b><small>締切 ' + esc(N.hm(N.closeAt(r))) + "（発走の" + D.CLOSE_BEFORE / 60 + "分前）・結果と払い戻しはデータが届きしだい</small>" +
      (r.st === "entry" ? '<small class="cd-pre">枠順の発表前です。馬名で買えます（馬番は発表されしだい券に入ります・ふつうは木曜の午後）</small>' : "") + "</div>";
    if (st === "pre") return '<div class="cd"><span>発売開始まで</span><b data-cd="' + N.saleAt(r) + '">' + N.left(N.saleAt(r) - t) + '</b><small>' + esc(N.dtStr(N.saleAt(r))) + " から発売・締切 " + esc(N.hm(N.closeAt(r))) + "（発走の" + D.CLOSE_BEFORE / 60 + "分前）</small></div>";
    /* ★★ 2026-10-22 前日発売の締切（土曜 17:30）〜当日発売（土曜 19:30）。JRA と同じく、このあいだは買えない */
    if (st === "gap") { const nx = N.nextSaleAt(r, t) || N.closeAt(r); return '<div class="cd"><span>当日発売まで</span><b data-cd="' + nx + '">' + N.left(nx - t) + '</b><small>前日発売は終了・' + esc(N.dtStr(nx)) + " から当日発売（締切 " + esc(N.hm(N.closeAt(r))) + "）</small></div>"; }
    if (st === "entry") return '<div class="cd"><span>発走まで</span><b data-cd="' + N.postAt(r) + '">' + N.left(N.postAt(r) - t) + '</b><small>発売は ' + esc(N.dtStr(N.saleAt(r))) + " から（枠順の発表前でも馬名で買えます・枠順はふつう木曜の午後）</small></div>";
    if (st === "sched") return '<div class="cd"><span>発走まで</span><b data-cd="' + N.postAt(r) + '">' + N.left(N.postAt(r) - t) + '</b><small>出走登録は1週間前の日曜</small></div>';
    if (st === "closed") return '<div class="cd hot"><span>締切 ── 発走まで</span><b data-cd="' + N.postAt(r) + '">' + N.left(N.postAt(r) - t) + "</b></div>";
    if (st === "run") return '<div class="cd hot"><span>🏇 発走しました！</span><small>結果は自動取得を待っています（GⅠ の日は数分ごと）</small></div>';
    if (st === "wait") return '<div class="cd"><span>⏳ 結果待ち</span><small>結果と払戻金は自動取得が届けます（GⅠ の日は発走の前後に数分ごと）。届きしだい精算します（' + PAY_NOTE + "）</small></div>";
    return "";
  }
  /* ★★ 2026-10-26 ご指定「結果や払い戻しは端末が情報を受信でき次第。そのため取得時刻が前後することを注意」 */
  const PAY_NOTE = "結果の取得の時刻は前後することがあります";
  /* ★★ 2026-10-26 ご指定「競馬のライブ配信へのショートカット」：JRA 公式の無料ライブ（グリーンチャンネル「中央競馬全レース中継」・開催日の 9〜17時ごろ・20〜30秒おくれ） */
  const LIVE_URL = "https://www.jra.go.jp/tvradio/racelive/";
  function liveBtn(big) {
    return '<a class="btn live' + (big ? " big" : "") + '" href="' + LIVE_URL + '" target="_blank" rel="noopener"><b>📺 ライブ配信を見る</b><small>JRA 公式・無料（開催日の 9〜17時ごろ・映像は少しおくれます）</small></a>';
  }
  /* レースの日で、発走の前後（発売中〜結果待ち）ならライブのボタンを大きく */
  function liveDay(r, st) { return r && N.ymd(now()) === r.date && (st === "sale" || st === "closed" || st === "run" || st === "wait"); }
  function topPicks(r, race, k) {
    if (!race) return "";
    const ents = N.runners(race).filter((e) => !e.cx);
    const rows = ents.map((e) => ({ e: e, o: N.winOdds(race, e) })).filter((x) => x.o).sort((a, b) => a.o[1] - b.o[1]).slice(0, k || 5);
    if (!rows.length) return "";
    const kind = race.odds && race.odds.kind;
    return '<div class="picks"><div class="picks-h">' + esc(N.oddsKindNm[kind] || "オッズ") + (race.odds && race.odds.at ? "<small>" + esc(String(race.odds.at).slice(5, 16)) + " 時点</small>" : "") + "</div>" +
      rows.map((x) => '<div class="pk">' + (x.e.no ? noChip(x.e.no, x.e.waku) : '<b class="no dim">–</b>') + '<span class="pk-nm">' + esc(x.e.nm) + '<small>' + esc(x.e.j || "") + '</small></span><span class="pk-o"><b>' + esc(x.o[0]) + "</b><small>" + esc(x.o[1]) + "人気</small></span></div>").join("") + "</div>";
  }
  function heroHTML(r) {
    if (!r) return "";
    const t = now(), st = N.status(r, t);
    const race = r.rid ? N.peekRace(r.rid) : null;
    if (r.rid && !race) N.race(r.rid, r.st === "result").then(() => render()).catch(() => {});
    const inf = D.info(r.nm);
    let body = "";
    if (st === "final" && race && race.result) {
      const fin = race.result.rows.filter((x) => N.posNum(x.pos) <= 3).sort((a, b) => N.posNum(a.pos) - N.posNum(b.pos));
      const P = race.result.pay || {};
      body = '<div class="podium">' + fin.map((x) => '<div class="pd ' + posCls(x.pos) + '"><em>' + esc(x.pos) + "着</em>" + noChip(x.no, x.waku) + "<b>" + esc(x.nm) + "</b><small>" + esc(x.j) + "・" + esc(x.pop) + "人気</small></div>").join("") + "</div>" +
        '<div class="paymini">' + [["win", "単勝"], ["quin", "馬連"], ["tri", "3連単"]].map((k) => { const p = (P[k[0]] || [])[0]; return p ? "<span><small>" + k[1] + "</small><b>" + yen(p.y) + "</b><i>" + esc(p.c.join(k[0] === "tri" ? "→" : "-")) + "</i></span>" : ""; }).join("") + "</div>";
    } else body = topPicks(r, race, 5);
    const btns = st === "final"
      ? '<button class="btn" data-race="' + r.rid + '" data-rt="result">結果・払戻を見る</button>'   /* ★★ 2026-10-26 ご指定「結果で再現は要りません」→ 再現アニメのボタンは外した */
      : r.rid ? '<button class="btn" data-race="' + r.rid + '">出馬表・データ</button>' + (st === "sale" ? '<button class="btn pri buy-go" data-bet="' + r.rid + '">馬券を買う<small>発売中</small></button>' : "") : "";
    return '<section class="hero ' + surfCls(r) + " s-" + st + '">' +
      '<div class="hero-deco" aria-hidden="true"></div>' +
      '<div class="hero-top"><span class="g1">G1</span><span class="hero-date">' + esc(N.dateStr(r.date)) + " " + esc(r.post || "") + ' 発走</span>' + statusChip(st) + "</div>" +
      '<h2 class="hero-nm" ' + (r.rid ? 'data-race="' + r.rid + '"' : "") + ">" + esc(inf.alias || r.nm) + "</h2>" +
      '<div class="hero-sub">' + courseStr(r) + (race && race.dir ? "（" + esc(race.dir.replace(/\s*[A-D]$/, "")) + "）" : "") + "・" + esc(r.cond || "") + "・" + esc(r.rule || "") + (race && race.prize ? "・1着 " + esc(prizeStr(race.prize)) : "") + "</div>" +
      (inf.tag ? '<p class="hero-tag">' + esc(inf.tag) + "</p>" : "") +
      cdBlock(r, st) + (liveDay(r, st) ? '<div class="vbtns">' + liveBtn(true) + "</div>" : "") + body +
      (st === "final" ? videoBtns(r, race) : "") +
      '<div class="hero-btns">' + btns + "</div></section>";
  }
  /* ★★ 2026-10-21 ご指定「結果で実際のレースの動画にとべるように」：JRA 公式 YouTube のレース映像（自動取得が見つけたもの）
     ★★ 2026-10-26 ご指定「ネット競馬の動画に進むボタンを、そのレースの特集ページに進むに」→ netkeiba の「特集へ」と同じ special/index.html?race_id= */
  function videoBtns(r, race) {
    const yt = (race && race.video && race.video.yt) || r.yt;
    const q = encodeURIComponent(String(r.date || "").slice(0, 4) + "年 " + (D.info(r.nm).alias || r.nm) + " GⅠ JRA公式");
    return '<div class="vbtns">' +
      (yt ? '<a class="btn vid" href="https://www.youtube.com/watch?v=' + encodeURIComponent(yt) + '" target="_blank" rel="noopener"><b>▶ 実際のレース映像</b><small>JRA公式 YouTube</small></a>'
        : '<a class="btn vid" href="https://www.youtube.com/results?search_query=' + q + '" target="_blank" rel="noopener"><b>▶ レース映像をさがす</b><small>JRA公式 YouTube</small></a>') +
      '<a class="btn vid2" href="https://race.netkeiba.com/special/index.html?race_id=' + encodeURIComponent(r.rid) + '" target="_blank" rel="noopener"><b>このレースの特集ページ</b><small>netkeiba</small></a></div>';
  }
  function myMini() {
    const s = B.load();
    const tk = Object.values(s.tk);
    const open = tk.filter((t) => t.st === "open" || t.st === "ready");
    const recent = tk.filter((t) => t.st === "hit").sort((a, b) => (b.done || 0) - (a.done || 0)).slice(0, 1);
    if (!tk.length) return '<section class="card mini"><b>🎫 はじめての馬券</b><p>実際の GⅠ に XEVA で賭けられます。的中すると<b>実際の払戻金</b>（100円あたり）がそのまま XEVA で戻ります。</p></section>';
    return '<section class="card mini" data-tab="tickets"><div class="mini-row"><span><small>発走・結果待ち</small><b>' + open.length + '</b>枚</span><span><small>払戻</small><b>' + fmt(s.st.ret) + '</b></span><span><small>回収率</small><b>' + (s.st.bet ? Math.round(100 * s.st.ret / s.st.bet) : 0) + "%</b></span></div>" +
      (recent[0] ? '<p class="mini-hit">🎯 最近の的中：' + esc(D.shortName(recent[0].nm)) + " " + esc(B.TYPE[recent[0].type].nm) + " " + fmt(recent[0].pay) + " XEVA</p>" : "") + "</section>";
  }
  function seasonHTML(races) {
    const t = now();
    const byM = {};
    races.forEach((r) => { const m = Number(String(r.date).slice(5, 7)); (byM[m] = byM[m] || []).push(r); });
    let h = '<section class="season"><h3>' + esc((U.idx && U.idx.year) || "") + "年の GⅠ<small>全" + races.length + "レース・結果と払戻金は実際のもの</small></h3>";
    Object.keys(byM).map(Number).sort((a, b) => a - b).forEach((m) => {
      h += '<div class="mon"><em>' + m + "月</em>";
      byM[m].forEach((r) => {
        const st = N.status(r, t), inf = D.info(r.nm);
        let right;
        if (st === "final" && r.win) right = '<span class="sr-win"><b>' + esc(r.win.nm) + "</b><small>単勝 " + (r.pay && r.pay.win ? yen(r.pay.win) : "–") + (r.pay && r.pay.tri ? "・3連単 " + yen(r.pay.tri) : "") + "</small></span>";
        else if (st === "sale") right = '<span class="sr-buy" data-bet="' + r.rid + '">発売中<b>買う ›</b></span>';
        else right = statusChip(st);
        h += '<button class="srow ' + surfCls(r) + " s-" + st + '" ' + (r.rid ? 'data-race="' + r.rid + '"' : "disabled") + '><span class="sr-d">' + esc(N.dateStr(r.date)) + "</span>" +
          '<span class="sr-nm"><b>' + esc(inf.short || inf.alias || r.nm) + "</b><small>" + courseStr(r) + "・" + esc(r.cond || "") + "</small></span>" + right + "</button>";
      });
      h += "</div>";
    });
    return h + "</section>";
  }
  function footHTML() {
    const at = U.idx && U.idx.at;
    return '<footer class="foot"><p>データ：netkeiba（JRA の発表をもとにしたもの）の公開ページから、XEVARION の自動取得が1時間ごとに（GⅠ の日は発走の前後に数分ごと）集めています。' +
      (at ? "<br>最終更新 " + esc(N.dateStr(N.ymd(at), false)) + " " + esc(N.hm(at)) + "（" + esc(agoStr(at)) + "）" : "") + "</p><p>馬券は XEVA（1 XEVA ＝ 1円）で、払い戻しは実際の払戻金どおりです。発売はレースの日の" + (D.SALE_DAYS_BEFORE || 3) + "日前の 0:00 から、締切は発走の2分前（サーバーの時刻で判定）。結果と払い戻しは、この端末が結果のデータを受け取りしだい行います（" + PAY_NOTE + "）。</p>" +
      '<p class="foot-btns"><button class="btn" data-a="help">📘 使い方（アニメ）</button><button class="btn" data-a="helpTypes">🎫 馬券の種類</button></p></footer>';
  }
  /* ★★ 2026-10-21 ご指定「新しい GⅠ が買えるようになったら、ボタンをわかりやすく」：発売中のレースは、いちばん上に大きな札 */
  function saleBar(races) {
    const t = now();
    return races.filter((r) => N.status(r, t) === "sale").map((r) =>
      '<button class="salebar" data-bet="' + r.rid + '"><span class="sb-tx"><b>' + esc(D.info(r.nm).alias || D.shortName(r.nm)) + ' 発売中！</b>' +
      '<small>締切 ' + esc(N.hm(N.closeAt(r))) + '（発走の2分前）・あと <i data-cd="' + N.closeAt(r) + '">' + N.left(N.closeAt(r) - t) + '</i></small></span><em>馬券を買う ›</em></button>').join("");
  }
  /* ★★ 2026-10-26 ご指定「GⅠ の結果が出たら上に結果を見るボタン（結果発表から三日目まで）」
     → 結果が出たレースは、レースの日を1日目として3日目の終わり（3日後の 0:00）まで、いちばん上に札 */
  function resultBar(races) {
    const t = now();
    return races.filter((r) => r.st === "result" && r.rid && t < N.dayAt(r.date, 3)).slice(-2).reverse().map((r) =>
      '<button class="rsbar" data-race="' + r.rid + '" data-rt="result"><span class="rs-ic">🏆</span><span class="rs-tx"><b>' + esc(D.info(r.nm).alias || D.shortName(r.nm)) + " の結果が出ました</b><small>" +
      (r.win ? "1着 " + esc(r.win.nm) + (r.pay && r.pay.win ? "・単勝 " + yen(r.pay.win) + "円" : "") + (r.pay && r.pay.tri ? "・3連単 " + yen(r.pay.tri) + "円" : "") : "着順と払戻金を見る") + "</small></span><em>結果を見る ›</em></button>").join("");
  }
  function homeHTML() {
    if (!U.idx) return loadingHTML(U.err);
    const races = U.idx.races || [];
    if (!races.length) return loadingHTML("まだ今年の GⅠ のデータがありません");
    /* ★★ 2026-10-24 結果が出て、まだ確かめていない馬券があれば、いちばん上に札（押すと馬券タブ） */
    const rdy = B.readyList();
    const rv = rdy.length ? '<button class="rvbar" data-tab="tickets"><span class="rv-ic">🎫</span><span class="rv-tx"><b>結果が出た馬券が ' + rdy.length + " 枚あります</b><small>馬券タブで1枚ずつ押して確認（押したときに払い戻し）</small></span><em>確認する ›</em></button>" : "";
    return rv + resultBar(races) + saleBar(races) + heroHTML(N.focusRace(races, now())) + myMini() + seasonHTML(races) + footHTML();
  }

  /* ══════════ 馬券タブ ══════════
     ★★ 2026-10-24 ご指定「購入した馬券は実際の馬券のようにそれぞれ表示・購入した馬券一覧で確認・結果は券をそれぞれ押して確認」
     ・券面は勝馬投票券ふう：左＝年・回・日・場／レース番号／レース名／発行（MagiDerby）と買った日、
       緑の帯、まん中＝券種（縦書き＋英語）、右＝買い目と金額（☆で桁をうめる）、下＝合計（★）と通し番号。
       ★ 公式のロゴは使わない。★★ 2026-10-24 2回目のご指定：地の透かしは XEVARION のロゴ・QR は要らない。
     ・馬名・レース名は1行のまま、はみ出すぶんだけ横に詰める（実際の券の詰め字。文字の高さは変えない＝fitNames）。
     ・結果が出た券（st="ready"）は「タップして確認」→ 押すと判が押されて、そのとき払い戻し（md-bet の B.reveal）。 */
  const ST_NM = { open: "発走・結果待ち", ready: "結果あり・未確認", hit: "的中", miss: "はずれ", refund: "返還", void: "返還" };
  const PLACE_CODE = { "01": "札幌", "02": "函館", "03": "福島", "04": "新潟", "05": "東京", "06": "中山", "07": "中京", "08": "京都", "09": "阪神", "10": "小倉" };
  const TYPE_EN = { win: "WIN", place: "PLACE", waku: "BRACKET", quin: "QUINELLA", wide: "WIDE", exa: "EXACTA", trio: "TRIO", tri: "TRIFECTA" };
  const MODE_EN = { box: "BOX", nag: "WHEEL", form: "FORMATION" };
  function h32(s) { let h = 2166136261; s = String(s || ""); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function prng(seed) { let x = (seed >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  function kaiOf(tk) {
    const m = String(tk.rid || "").match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/);
    return m ? { y: m[1], pl: PLACE_CODE[m[2]] || tk.place || "", kai: Number(m[3]), day: Number(m[4]), rno: Number(m[5]) }
      : { y: String(tk.date || "").slice(0, 4), pl: tk.place || "", kai: 0, day: 0, rno: 11 };
  }
  const star = (s, w, ch) => { s = String(s); return (s.length < w ? (ch || "☆").repeat(w - s.length) : "") + s; };
  function nameOf(race, no) { if (!race) return ""; const e = N.runners(race).find((x) => x.no === no); return e ? e.nm : ""; }
  /* ★★ 2026-10-24 枠順の発表前に買った券（B.isPre）は、番号の代わりに「?」・名前は券に残した馬名（pn）。
     差し替えたあとで出走しなかった馬（0）は「消」 */
  const tkName = (tk, race, x) => (B.isPre(tk) ? (tk.pn && tk.pn[x]) || "" : nameOf(race, x) || (tk.nn && tk.nn[x]) || "");
  const tkNo = (tk, x) => (B.isPre(tk) ? "?" : x ? x : "消");
  /* ★★ 2026-10-24 ご指定「馬の名前は1行で・文字の高さは変えず実際の馬券のように詰め字」
     → 枠（.jt-hn など）の幅に入りきらないぶんだけ、中の span を横だけ縮める（scaleX）。券の幅が変わったら測りなおす。 */
  function fitNames(root) {
    $$(".jt .fit", root || document).forEach((s) => {
      s.style.transform = "";
      const box = s.parentElement, w = box.clientWidth, sw = s.scrollWidth;
      if (w > 0 && sw > w + 0.5) s.style.transform = "scaleX(" + (w / sw).toFixed(4) + ")";
    });
  }
  let fitT = 0;
  window.addEventListener("resize", () => { clearTimeout(fitT); fitT = setTimeout(() => fitNames(), 120); });
  try { document.fonts && document.fonts.ready.then(() => fitNames()); } catch (e) {}
  /* ★★ 2026-10-26 字体（明朝）が描いたあとに届くと幅が変わる → 届いたら全部を測りなおす。描いた直後も次の画面・少しあとに測りなおす */
  try { if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", () => fitNames()); } catch (e) {}
  function fitSoon(root) {
    fitNames(root);
    requestAnimationFrame(() => fitNames(root));
    setTimeout(() => fitNames(root), 350);
    setTimeout(() => fitNames(root), 1200);
  }
  function numsHTML(tk, c) { const T = B.TYPE[tk.type]; return c.map((x) => '<i class="jt-n' + (T.frame ? " fr" : "") + (B.isPre(tk) ? " pre" : "") + '">' + esc(tkNo(tk, x)) + "</i>").join('<s>' + (T.ord ? "→" : "−") + "</s>"); }
  /* 右側（買い目と金額） */
  function jtSel(tk, race) {
    const T = B.TYPE[tk.type], amt = '<span class="jt-am">' + star(fmt(tk.u), 6) + "<small>XEVA</small></span>";
    const list = (a) => (B.isPre(tk) ? (a || []).map((x) => esc(tkName(tk, race, x))).join("・") : (a || []).map((x) => esc(x || "消")).join("・"));
    if (T.n === 1 && tk.cb.length === 1) {
      const no = tk.cb[0][0];
      return '<div class="jt-one"><i class="jt-n big' + (B.isPre(tk) ? " pre" : "") + '">' + esc(tkNo(tk, no)) + '</i><b class="jt-hn"><span class="fit">' + esc(tkName(tk, race, no)) + "</span></b></div>" + '<div class="jt-amr">' + amt + "</div>";
    }
    if (tk.mode === "box") return '<div class="jt-md"><em>' + MODE_EN.box + "</em><b>" + list((tk.sel.pick || []).slice().sort((a, b) => a - b)) + "</b></div>" + '<div class="jt-amr"><small>各組</small>' + amt + "</div>";
    if (tk.mode === "nag") {
      const pos = B.lineLabel(tk).replace(/^.*?（|）$/g, "");
      return '<div class="jt-md"><em>' + MODE_EN.nag + "</em><b>軸 " + list(tk.sel.axis || []) + "</b><span>相手 " + list(tk.sel.part || []) + "</span>" + (pos && T.ord ? "<small>" + esc(pos) + "</small>" : "") + "</div>" + '<div class="jt-amr"><small>各組</small>' + amt + "</div>";
    }
    if (tk.mode === "form") {
      const lab = T.ord ? ["1着", "2着", "3着"] : ["1頭目", "2頭目", "3頭目"];
      return '<div class="jt-md"><em>' + MODE_EN.form + "</em>" + (tk.sel.cols || []).slice(0, T.n).map((col, k) => "<span>" + lab[k] + " " + list(col || []) + "</span>").join("") + "</div>" + '<div class="jt-amr"><small>各組</small>' + amt + "</div>";
    }
    const rows = tk.cb.slice(0, 4).map((c) => '<div class="jt-row"><span class="jt-cb">' + numsHTML(tk, c) + "</span>" + (T.n === 1 || tk.pm ? '<b class="jt-hs"><span class="fit">' + esc(c.map((x) => tkName(tk, race, x)).join(T.ord ? "→" : "・")) + "</span></b>" : "") + amt + "</div>").join("");
    return '<div class="jt-rows">' + rows + (tk.cb.length > 4 ? '<div class="jt-more">ほか ' + (tk.cb.length - 4) + " 点</div>" : "") + "</div>";
  }
  function stampHTML(tk) {
    if (tk.st === "hit") return '<i class="jt-stamp hit"><b>的中</b><small>' + fmt(tk.pay) + "</small></i>";
    if (tk.st === "miss") return '<i class="jt-stamp miss"><b>はずれ</b></i>';
    if (tk.st === "refund" || tk.st === "void") return '<i class="jt-stamp ref"><b>返還</b></i>';
    return "";
  }
  /* 券面（big＝くわしく見る画面の大きな券） */
  function jtHTML(tk, big) {
    const T = B.TYPE[tk.type], K = kaiOf(tk), race = N.peekRace(tk.rid), sd = h32(tk.id);
    const bought = new Date((tk.at || Date.now()) + 9 * 3600000);
    const R = prng(sd ^ 0x9e3779b9), dg = (k) => { let s = ""; for (let i = 0; i < k; i++) s += Math.floor(R() * 10); return s; };
    const tyW = T.nm.replace(/^3連/, "三連");
    return '<article class="jt st-' + tk.st + (big ? " big" : "") + '"' + (big ? "" : ' data-tk="' + esc(tk.id) + '"') + ">" +
      '<div class="jt-p">' +
        '<div class="jt-l">' +
          '<div class="jt-kai">' + esc(K.y) + "年" + (K.kai ? K.kai + "回" + K.day + "日" : "") + "</div>" +
          '<div class="jt-pl"><b>' + esc(K.pl) + '</b><span class="jt-gr">GⅠ</span></div>' +
          '<div class="jt-rno"><b>' + esc(K.rno) + "</b><span>レース</span></div>" +
          '<div class="jt-nm"><small>（GⅠ）</small><b><span class="fit">' + esc(D.shortName(tk.nm)) + "</span></b></div>" +
          '<div class="jt-is"><b>MagiDerby</b> XEVARION<br>' + (bought.getUTCMonth() + 1) + "月" + bought.getUTCDate() + "日</div>" +
        "</div>" +
        '<div class="jt-band" aria-hidden="true"></div>' +
        '<div class="jt-ty"><small>' + TYPE_EN[tk.type] + "</small><b>" + esc(tyW) + "</b><small>" + (tk.mode && tk.mode !== "norm" ? MODE_EN[tk.mode] : TYPE_EN[tk.type]) + "</small></div>" +
        '<div class="jt-r">' + jtSel(tk, race) + "</div>" +
        '<div class="jt-b"><div class="jt-sum">合計 <b>' + star(tk.cb.length, 5, "★") + "</b>点 <b>" + star(fmt(tk.cost), 6, "★") + '</b><small>XEVA</small></div>' +
          '<div class="jt-ser">' + dg(13) + " " + dg(13) + " " + dg(8) + " " + dg(6) + "</div></div>" +
        stampHTML(tk) +
        (tk.st === "ready" ? '<div class="jt-rdy"><b>結果が出ました！</b><span>タップして確認</span></div>' : "") +
      "</div></article>";
  }
  function jtStateHTML(tk) {
    if (tk.st === "hit") return '<div class="jt-res hit"><span>払戻</span><b>' + fmt(tk.pay) + " XEVA</b><small>" + (tk.hits || []).map((h) => esc(B.comboStr(tk.type, h[0])) + "＝" + yen(h[1]) + "円").join("・") + (tk.bo > 1 ? "・🎃+" + Math.round((tk.bo - 1) * 100) + "%" : "") + (tk.ref ? "・返還 " + fmt(tk.ref) : "") + "</small></div>";
    if (tk.st === "miss") return '<div class="jt-res miss">はずれ' + (tk.ref ? "（返還 " + fmt(tk.ref) + " XEVA）" : "") + "</div>";
    if (tk.st === "refund" || tk.st === "void") return '<div class="jt-res ref">返還 ' + fmt(tk.pay) + " XEVA" + (tk.st === "void" ? "（締切後の記録）" : "（取消・除外）") + "</div>";
    if (tk.st === "ready") return '<div class="jt-res rdy">結果が出ています・押して確認すると払い戻します</div>';
    /* ★★ 2026-10-24 ご指定「結果待ちで勝敗の確定日をそれぞれ表示」→ ★★ 2026-10-26 ご指定で次の日の 0:00 を待たなくなった（データが届きしだい）ので、
       決まった時刻ではなく「発走のあと、データが届きしだい」と出す（取得の時刻は前後する） */
    const rr = raceOf(tk.rid);
    if (B.isPre(tk)) return '<div class="jt-res open"><span>枠順の発表前に購入・馬番は発表されしだい入ります</span><b>結果は発走のあと届きしだい</b></div>';
    return '<div class="jt-res open"><span>' + (rr && rr.st === "result" ? "レースは終了（結果を受け取っています…）" : esc(N.dateStr(tk.date)) + " " + esc(tk.post || "") + " 発走") + "</span>" +
      "<b>結果は届きしだい（時刻は前後します）</b></div>";
  }
  /* 1枚の券（一覧）＝券面＋下の一行 */
  function ticketHTML(tk) { return '<div class="jtw">' + jtHTML(tk, false) + jtStateHTML(tk) + "</div>"; }
  function ticketsHTML() {
    /* ★★ 2026-10-26 券種の無い（こわれた）券が1枚あると一覧ごと描けなくなるので飛ばす */
    const s = B.load(), all = Object.values(s.tk).filter((t) => t && B.TYPE[t.type] && Array.isArray(t.cb)).sort((a, b) => (b.at || 0) - (a.at || 0));
    const rdy = all.filter((t) => t.st === "ready");
    let h = "";
    if (rdy.length) h += '<button class="rvbar" data-a="rvAll"><span class="rv-ic">🎫</span><span class="rv-tx"><b>結果が出た馬券が ' + rdy.length + " 枚</b><small>券を1枚ずつ押して確認・まとめて確認もできます</small></span><em>" + (rdy.length > 1 ? "まとめて確認 ›" : "確認する ›") + "</em></button>";
    h += '<h3 class="tk-h">購入した馬券<small>' + all.length + "枚</small></h3>";
    /* ★★ 2026-10-26（2回目）ご指定「結果の馬券一覧で MagiChemLex のような絞り込みと並び替え」
       → 「絞り込み」「並び替え」の2つのボタン。押すと下から選ぶ板（状態・レース・券種／並びの順）。条件の数をボタンに */
    if (U.tkr && !all.some((t) => t.rid === U.tkr)) U.tkr = "";
    const nf = (U.tkf !== "all" ? 1 : 0) + (U.tkr ? 1 : 0) + (U.tkt ? 1 : 0);
    h += '<div class="tk-tools"><button class="tk-fb' + (nf ? " on" : "") + '" data-a="tkFilter">⚙ 絞り込み' + (nf ? "<b>" + nf + "</b>" : "") + "</button>" +
      '<button class="tk-fb' + (U.tks !== "new" ? " on" : "") + '" data-a="tkSort">⇅ ' + esc(TK_SORT[U.tks] || "並び替え") + "</button>" +
      (rdy.length ? '<button class="tk-fb rdy" data-a="tkReady">結果あり<b>' + rdy.length + "</b></button>" : "") + "</div>";
    const list = tkSorted(tkFiltered(all));
    needRaces(list.slice(0, 120));
    if (!list.length) h += '<div class="empty sm"><b>' + (all.length ? "あてはまる馬券はありません" : "まだ馬券がありません") + "</b><p>GⅠ タブから、発売中のレースの馬券を買えます。</p></div>";
    else h += '<div class="jts">' + list.slice(0, 120).map(ticketHTML).join("") + "</div>";
    h += '<p class="tk-note">🕒 結果と払い戻しは、この端末が<b>結果のデータを受け取りしだい</b>行います。データは自動で集めているので、<b>反映の時刻は前後することがあります</b>（ふつうはレースの数分〜数十分後）。</p>';
    return h;
  }
  /* ── 絞り込み・並び替え（★★ 2026-10-26 2回目）── */
  const TK_ST = [["all", "すべて"], ["ready", "結果あり（未確認）"], ["open", "結果待ち"], ["hit", "的中"], ["miss", "はずれ・返還"]];
  const TK_SORT = { new: "買った順（新しい）", old: "買った順（古い）", race: "レースの日（新しい）", pay: "払戻の多い順", cost: "金額の多い順" };
  function tkFiltered(all) {
    return all.filter((t) => (!U.tkr || t.rid === U.tkr) && (!U.tkt || t.type === U.tkt) &&
      (U.tkf === "all" || t.st === U.tkf || (U.tkf === "miss" && (t.st === "miss" || t.st === "refund" || t.st === "void"))));
  }
  function tkSorted(list) {
    const k = U.tks, at = (t) => t.at || 0;
    return list.slice().sort((a, b) => k === "old" ? at(a) - at(b) : k === "race" ? String(b.date || "").localeCompare(String(a.date || "")) || at(b) - at(a)
      : k === "pay" ? (b.pay || 0) - (a.pay || 0) || at(b) - at(a) : k === "cost" ? (b.cost || 0) - (a.cost || 0) || at(b) - at(a) : at(b) - at(a));
  }
  function tkAll() { return Object.values(B.load().tk).filter((t) => t && B.TYPE[t.type] && Array.isArray(t.cb)); }
  function openTkFilter() {
    const all = tkAll();
    const rmap = {}; all.forEach((t) => { const o = rmap[t.rid] = rmap[t.rid] || { rid: t.rid, nm: t.nm, date: t.date || "", n: 0 }; o.n++; });
    const rl = Object.values(rmap).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const tyN = {}; all.forEach((t) => { tyN[t.type] = (tyN[t.type] || 0) + 1; });
    const cnt = (f) => all.filter(f).length;
    const chip = (attr, v, cur, label, n) => '<button class="tkc' + (cur === v ? " on" : "") + '" data-' + attr + '="' + esc(v) + '">' + label + (n != null ? "<small>" + n + "</small>" : "") + "</button>";
    const html = '<div class="sh-hd"><b>絞り込み<small>' + tkFiltered(all).length + " / " + all.length + '枚</small></b><button class="sh-x" data-a="closeSheet" aria-label="閉じる">✕</button></div><div class="sh-body tkfs">' +
      "<h4>状態</h4><div class=\"tkcs\">" + TK_ST.map((x) => chip("tkf", x[0], U.tkf, x[1], x[0] === "all" ? all.length : cnt((t) => t.st === x[0] || (x[0] === "miss" && (t.st === "refund" || t.st === "void"))))).join("") + "</div>" +
      "<h4>レース</h4><div class=\"tkcs\">" + chip("tkr", "", U.tkr, "すべて", all.length) + rl.map((o) => chip("tkr", o.rid, U.tkr, esc(D.shortName(o.nm)) + " <i>" + esc(N.dateStr(o.date, false)) + "</i>", o.n)).join("") + "</div>" +
      "<h4>券種</h4><div class=\"tkcs\">" + chip("tkt", "", U.tkt, "すべて", all.length) + B.TYPES.filter((T) => tyN[T.k]).map((T) => chip("tkt", T.k, U.tkt, T.nm, tyN[T.k])).join("") + "</div>" +
      '<div class="tkfs-btns"><button class="btn" data-a="tkClear">条件をリセット</button><button class="btn pri" data-a="closeSheet">この条件で見る</button></div></div>';
    if (U.sheetOpen && $("#sheet .sh-pane.tkfs-pane")) $("#sheet .sh-pane").innerHTML = html; else openSheet(html, "tkfs-pane");
  }
  function openTkSort() {
    const html = '<div class="sh-hd"><b>並び替え</b><button class="sh-x" data-a="closeSheet" aria-label="閉じる">✕</button></div><div class="sh-body tkfs"><div class="tkcs col">' +
      Object.keys(TK_SORT).map((k) => '<button class="tkc' + (U.tks === k ? " on" : "") + '" data-tks="' + k + '">' + esc(TK_SORT[k]) + "</button>").join("") + "</div></div>";
    openSheet(html, "tkfs-pane");
  }
  /* ★★ 2026-10-26 ご報告「馬券の結果で馬の名前が出ない／詰めて表示されないことがある」
     ① 出馬表の控えが端末に無い券（同期で届いた・控えが消えた）は名前が空だった → 一覧に出す券のレースを読みに行き、届いたら描き直す
     ② 詰め字（fitNames）が、描いたあとに読みこまれた字体・あとから入った名前に追いついていなかった → fitSoon で何回か測りなおす */
  const asked = {};
  function needRaces(list) {
    const want = {};
    list.forEach((t) => { if (!N.peekRace(t.rid) && !asked[t.rid]) want[t.rid] = 1; });
    Object.keys(want).forEach((rid) => {
      asked[rid] = 1;
      const r = raceOf(rid);
      N.race(rid, !!(r && r.st === "result")).then(() => { if (U.tab === "tickets") render(); }).catch(() => {});
    });
  }
  /* ★★ 2026-10-24 ご指定「馬券タブの上の成績はマイページボタンを上部に置き、そこから見る」 */
  function openMyPage() {
    const s = B.load(), all = Object.values(s.tk), pl = s.st.ret - s.st.bet;
    const cnt = (f) => all.filter(f).length;
    const byType = {}; all.forEach((t) => { if (t.st === "open" || t.st === "ready") return; const k = t.type, o = byType[k] = byType[k] || { n: 0, hit: 0, bet: 0, ret: 0 }; o.n++; o.bet += t.cost || 0; o.ret += t.pay || 0; if (t.st === "hit") o.hit++; });
    const tyRows = Object.keys(B.TYPE).filter((k) => byType[k]).map((k) => { const o = byType[k]; return "<tr><td><b>" + esc(B.TYPE[k].nm) + "</b></td><td>" + o.n + "</td><td>" + o.hit + "</td><td>" + fmt(o.bet) + "</td><td>" + fmt(o.ret) + "</td><td>" + (o.bet ? Math.round(100 * o.ret / o.bet) : 0) + "%</td></tr>"; }).join("");
    const html = '<div class="sh-hd"><b>マイページ<small>MagiDerby の成績（XEVA）</small></b><button class="sh-x" data-a="closeSheet" aria-label="閉じる">✕</button></div>' +
      '<div class="sh-body mypg"><section class="card stat"><div class="stat-g">' +
      '<span><small>買った額</small><b>' + fmt(s.st.bet) + "</b></span>" +
      '<span><small>払い戻し</small><b>' + fmt(s.st.ret) + "</b></span>" +
      '<span class="' + (pl >= 0 ? "plus" : "minus") + '"><small>収支</small><b>' + (pl >= 0 ? "+" : "") + fmt(pl) + "</b></span>" +
      '<span><small>回収率</small><b>' + (s.st.bet ? Math.round(100 * s.st.ret / s.st.bet) : 0) + "%</b></span>" +
      '<span><small>的中</small><b>' + s.st.hit + " / " + s.st.n + "</b></span>" +
      '<span><small>最高払戻</small><b>' + (s.st.best ? fmt(s.st.best.pay) : "–") + "</b></span></div>" +
      (s.st.best ? '<p class="stat-best">🏆 ' + esc(D.shortName(s.st.best.nm || "")) + " " + esc((B.TYPE[s.st.best.type] || {}).nm || "") + " " + fmt(s.st.best.pay) + " XEVA</p>" : "") + "</section>" +
      '<section class="card"><h3>馬券の枚数</h3><div class="stat-g">' +
        '<span><small>結果待ち</small><b>' + cnt((t) => t.st === "open") + "</b></span>" +
        '<span><small>未確認</small><b>' + cnt((t) => t.st === "ready") + "</b></span>" +
        '<span><small>返還</small><b>' + cnt((t) => t.st === "refund" || t.st === "void") + "</b></span></div></section>" +
      (tyRows ? '<section class="card"><h3>券種ごと</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>券種</th><th>枚</th><th>的中</th><th>買った額</th><th>払戻</th><th>回収率</th></tr></thead><tbody>' + tyRows + "</tbody></table></div></section>" : "") +
      '<button class="btn" data-a="myTickets">購入した馬券を見る ›</button></div>';
    openSheet(html, "mypg-pane");
  }
  /* 券をくわしく見る（大きな券面＋結果）。ready なら「結果を確認する」 */
  function openTicket(id, anim) {
    const tk = B.load().tk[id]; if (!tk) return;
    const r = raceOf(tk.rid);
    if (!N.peekRace(tk.rid) || B.isPre(tk)) N.race(tk.rid, r && r.st === "result").then((rc) => { if (B.fixAll(tk.rid, rc) && U.tkOpen === id) { openTicket(id); render(); } else if (U.tkOpen === id && !N.peekRace(tk.rid)) openTicket(id); }).catch(() => {});
    U.tkOpen = id;
    const btns = tk.st === "ready"
      ? '<button class="btn pri big" data-rv="' + esc(id) + '">結果を確認する</button>'
      : '<button class="btn" data-race="' + esc(tk.rid) + '" data-rt="' + (tk.st === "open" ? "card" : "result") + '">' + (tk.st === "open" ? "出馬表・データを見る" : "レースの結果を見る") + "</button>";
    const html = '<div class="sh-hd"><b>馬券<small>' + esc(D.shortName(tk.nm)) + " " + esc(N.dateStr(tk.date)) + " " + esc(tk.post || "") + " 発走・" + esc(ST_NM[tk.st] || "") + '</small></b><button class="sh-x" data-a="closeSheet" aria-label="閉じる">✕</button></div>' +
      '<div class="sh-body tkd' + (anim ? " rv-anim" : "") + '"><div class="jt-zoom">' + jtHTML(tk, true) + "</div>" + jtStateHTML(tk) +
      '<div class="tkd-meta"><span>' + esc(B.lineLabel(tk)) + "</span><span>" + tk.cb.length + "点 × " + fmt(tk.u) + " XEVA</span><span>購入 " + esc(N.dtStr(tk.at)) + "</span></div>" +
      (tk.cb.length > 4 ? '<div class="tkd-cbs">' + tk.cb.map((c) => '<span class="cb' + ((tk.hits || []).some((h) => B.keyOf(tk.type, h[0]) === B.keyOf(tk.type, c)) ? " hit" : "") + '">' + esc(B.isPre(tk) ? c.map((x) => tkName(tk, null, x)).join(B.TYPE[tk.type].ord ? "→" : "−") : c.map((x) => x || "消").join(B.TYPE[tk.type].ord ? "→" : "-")) + "</span>").join("") + "</div>" : "") +
      '<div class="tkd-btns">' + btns + "</div></div>";
    if (U.sheetOpen && $("#sheet .sh-pane.tkd-pane")) { $("#sheet .sh-pane").innerHTML = html; zoomFit(); fitSoon($("#sheet")); return; }
    openSheet(html, "tkd-pane");
    zoomFit();
    fitSoon($("#sheet"));
  }
  /* ★★ 2026-10-26 ご報告「馬券をスマホで表示すると上の ✕ などが隠れる・下に線が出る」
     → スマホの縦向きは、拡大の画面を<b>画面いっぱいの板</b>にして（md.css の .tkd-pane）、倒した券の大きさを
       「券の欄の幅と高さ」から決める（はみ出してシートがスクロールしない＝ ✕ は上の端・スクロールの線も出ない） */
  function zoomFit() {
    const z = $("#sheet .jt-zoom"); if (!z) return;
    if (!matchMedia("(max-width:600px) and (orientation:portrait)").matches) { z.style.removeProperty("--L"); return; }
    const w = z.clientWidth, h = z.clientHeight;
    if (!w || !h) { requestAnimationFrame(zoomFit); return; }
    z.style.setProperty("--L", Math.floor(Math.min(h, w * 1.616)) + "px");
  }
  window.addEventListener("resize", () => { if (U.tkOpen) zoomFit(); });
  function winFx(sum, sub) {
    const fx = document.createElement("div"); fx.className = "winfx";
    fx.innerHTML = '<div class="winfx-card"><em>的中！</em><b>' + fmt(sum) + ' XEVA</b><small>' + sub + '</small><button class="btn pri" data-a="closeFx">うけとる</button></div>' +
      Array.from({ length: 28 }, (_, i) => '<i style="left:' + (i * 37 % 100) + "%;animation-delay:" + (i % 7) * 0.12 + "s;background:" + ["#ffd257", "#ff6b6b", "#4ade80", "#60a5fa", "#f472b6"][i % 5] + '"></i>').join("");
    document.body.appendChild(fx);
  }
  /* 1枚確かめる（判を押す演出 → 払い戻し） */
  async function revealOne(id) {
    const btn = $('[data-rv="' + id + '"]'); if (btn) { btn.disabled = true; btn.textContent = "確認しています…"; }
    const tk = await B.reveal(id);
    paintHead(); render();
    if (!tk) { toast("確認できませんでした。もう一度押してください", "err"); openTicket(id); return; }
    openTicket(id, true);
    if (tk.st === "hit") setTimeout(() => winFx(tk.pay, esc(D.shortName(tk.nm)) + " " + esc(B.TYPE[tk.type].nm) + "・" + (tk.hits || []).map((h) => esc(B.comboStr(tk.type, h[0]))).join("・")), 650);
  }
  /* まとめて確かめる */
  async function revealAll() {
    const L = B.readyList(); if (!L.length) return;
    if (L.length === 1) { openTicket(L[0].id); return; }
    const bar = $('[data-a="rvAll"]'); if (bar) { bar.disabled = true; const em = bar.querySelector("em"); if (em) em.textContent = "確認しています…"; }
    try { const XC = window.XevaCloud; if (navigator.onLine !== false && XC && XC.pullNow && (!XC.isLoggedIn || XC.isLoggedIn())) await XC.pullNow(); } catch (e) {}
    const got = [];
    for (const t of L) { const x = await B.reveal(t.id, { noPull: true }); if (x && x.rv) got.push(x); }
    paintHead(); U.tkf = "all"; render();
    const hits = got.filter((t) => t.st === "hit"), sum = hits.reduce((a, t) => a + t.pay, 0);
    if (hits.length) winFx(sum, hits.map((t) => esc(D.shortName(t.nm)) + " " + esc(B.TYPE[t.type].nm)).join("・") + "<br>（" + got.length + "枚を確認・的中 " + hits.length + "枚）");
    else toast("🎫 " + got.length + "枚を確認しました（的中なし）");
  }

  /* ══════════ データタブ（今年の GⅠ の傾向）══════════ */
  async function loadSeasonData() {
    const races = ((U.idx && U.idx.races) || []).filter((r) => r.st === "result" && r.rid);
    const out = [];
    for (const r of races) { try { const x = await N.race(r.rid, true); if (x && x.result) out.push({ r: r, race: x }); } catch (e) {} }
    U.data = out; render();
  }
  function dataHTML() {
    if (!U.idx) return loadingHTML(U.err);
    if (!U.data) { loadSeasonData(); return '<div class="empty"><div class="spin"></div><b>今年の GⅠ の結果を集めています…</b></div>'; }
    const L = U.data;
    if (!L.length) return '<div class="empty"><b>まだ確定した GⅠ がありません</b></div>';
    const win = L.map((x) => ({ x: x, w: x.race.result.rows.find((y) => y.pos === "1") })).filter((y) => y.w);
    /* 勝ち馬一覧 */
    let h = '<section class="card"><h3>' + esc(U.idx.year) + "年 GⅠ の勝ち馬</h3><div class=\"tbl-wrap\"><table class=\"tbl\"><thead><tr><th>レース</th><th>勝ち馬</th><th>騎手</th><th>人気</th><th>単勝</th><th>3連単</th></tr></thead><tbody>" +
      win.map((y) => { const P = y.x.race.result.pay; return '<tr data-race="' + y.x.r.rid + '" data-rt="result"><td><b>' + esc(D.shortName(y.x.r.nm)) + "</b><small>" + esc(N.dateStr(y.x.r.date, false)) + "</small></td><td>" + noChip(y.w.no, y.w.waku) + esc(y.w.nm) + "</td><td>" + esc(y.w.j) + "</td><td>" + esc(y.w.pop) + "</td><td>" + (P.win ? yen(P.win[0].y) : "") + "</td><td>" + (P.tri ? yen(P.tri[0].y) : "") + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
    /* 人気別の勝ち */
    const popW = {}; win.forEach((y) => { const p = Math.min(Number(y.w.pop) || 99, 10); popW[p] = (popW[p] || 0) + 1; });
    const maxP = Math.max.apply(null, Object.values(popW).concat([1]));
    h += '<section class="card"><h3>勝ち馬の人気</h3><div class="bars">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => '<div class="bar"><i style="height:' + Math.round(100 * (popW[p] || 0) / maxP) + '%"></i><b>' + (popW[p] || 0) + "</b><small>" + (p === 10 ? "10〜" : p) + "</small></div>").join("") + '</div><p class="sm">1番人気の勝ち：' + (popW[1] || 0) + " / " + win.length + "</p></section>";
    /* 枠番別 */
    const wkW = {}; win.forEach((y) => { wkW[y.w.waku] = (wkW[y.w.waku] || 0) + 1; });
    h += '<section class="card"><h3>勝ち馬の枠</h3><div class="wkrow">' + [1, 2, 3, 4, 5, 6, 7, 8].map((w) => '<div>' + wakuChip(w) + "<b>" + (wkW[w] || 0) + "</b></div>").join("") + "</div></section>";
    /* 騎手 */
    const jk = {}; L.forEach((x) => x.race.result.rows.forEach((y) => { const p = N.posNum(y.pos); if (p > 3) return; const k = y.j; jk[k] = jk[k] || [0, 0, 0]; jk[k][p - 1]++; }));
    const jl = Object.keys(jk).map((k) => ({ k: k, v: jk[k] })).sort((a, b) => b.v[0] - a.v[0] || b.v[1] - a.v[1] || b.v[2] - a.v[2]).slice(0, 10);
    h += '<section class="card"><h3>騎手（GⅠ の3着以内）</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>騎手</th><th>1着</th><th>2着</th><th>3着</th></tr></thead><tbody>' +
      jl.map((x) => "<tr><td><b>" + esc(x.k) + "</b></td><td>" + x.v[0] + "</td><td>" + x.v[1] + "</td><td>" + x.v[2] + "</td></tr>").join("") + "</tbody></table></div></section>";
    /* 高配当 */
    const big = L.map((x) => ({ x: x, p: (x.race.result.pay.tri || [])[0] })).filter((y) => y.p).sort((a, b) => b.p.y - a.p.y).slice(0, 5);
    h += '<section class="card"><h3>3連単の高配当</h3>' + big.map((y, i) => '<div class="bigpay" data-race="' + y.x.r.rid + '" data-rt="result"><em>' + (i + 1) + "</em><span><b>" + esc(D.shortName(y.x.r.nm)) + "</b><small>" + esc(y.p.c.join("→")) + "・" + esc(y.p.pop) + "番人気</small></span><b class=\"y\">" + yen(y.p.y) + "</b></div>").join("") + "</section>";
    /* 勝ちタイム・上がり */
    h += '<section class="card"><h3>勝ちタイムとペース</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>レース</th><th>距離</th><th>馬場</th><th>タイム</th><th>上がり</th><th>ペース</th></tr></thead><tbody>' +
      win.map((y) => '<tr data-race="' + y.x.r.rid + '" data-rt="result"><td>' + esc(D.shortName(y.x.r.nm)) + "</td><td>" + esc(y.x.r.surf + y.x.r.dist) + "</td><td>" + esc(N.going(y.x.race.going)) + "</td><td>" + esc(y.w.time) + "</td><td>" + esc(y.w.l3 || "") + "</td><td>" + esc(y.x.race.result.pace || "") + "</td></tr>").join("") + "</tbody></table></div></section>";
    return h + footHTML();
  }

  /* ══════════ 描画 ══════════ */
  function render() {
    const m = $("#main"); if (!m) return;
    const y = window.scrollY;
    m.innerHTML = U.tab === "tickets" ? ticketsHTML() : U.tab === "data" ? dataHTML() : homeHTML();
    $$(".tabs [data-tab]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-tab") === U.tab));
    /* ★★ 2026-10-24 結果が出て、まだ確かめていない馬券の数を「馬券」タブに */
    const tb = $('.tabs [data-tab="tickets"]'); if (tb) { const n = B.readyList().length; let i = tb.querySelector("i.tb-n"); if (n) { if (!i) { i = document.createElement("i"); i.className = "tb-n"; tb.appendChild(i); } i.textContent = n; } else if (i) i.remove(); }
    window.scrollTo(0, y);
    paintHead();
    fitSoon(m);
  }

  /* ══════════ レースの画面 ══════════ */
  const RT = [["card", "出馬表"], ["past", "馬柱"], ["odds", "オッズ"], ["course", "コース"], ["result", "結果"]];   /* ★★ 2026-10-26 再現はご指定で外した */
  async function openRace(rid, tab) {
    const r = raceOf(rid); if (!r) return;
    U.rid = rid; U.rtab = tab && tab !== "replay" ? tab : (r.st === "result" ? "result" : "card"); U.race = N.peekRace(rid); U.ex = null;
    const el = $("#race"); el.hidden = false; document.body.classList.add("noscroll");
    try { history.pushState({ md: "race" }, ""); } catch (e) {}
    renderRace();
    try { U.race = await N.race(rid, r.st === "result"); } catch (e) { if (!U.race) U.race = null; }
    if (U.rid === rid) renderRace();
    loadEx();
  }
  async function loadEx() {
    const r = raceOf(U.rid); if (!r || r.st === "result") return;
    const d = (new Date(r.date + "T00:00:00+09:00").getTime() - now()) / 86400000;
    if (d > 2) return;
    try { const ex = await N.odds(r.rid); if (U.rid === r.rid) { U.ex = ex; if (U.rtab === "odds") renderRace(); } } catch (e) {}
  }
  let ignorePop = 0;
  function closeRace(fromPop) {
    if (U.player) { U.player.destroy(); U.player = null; }
    const el = $("#race"); el.hidden = true; el.innerHTML = ""; document.body.classList.remove("noscroll");
    U.rid = null; U.race = null; U.ex = null;
    if (!fromPop) { try { if (history.state && history.state.md === "race") { ignorePop++; history.back(); } } catch (e) {} }
    render();
  }
  window.addEventListener("popstate", () => {
    if (ignorePop > 0) { ignorePop--; return; }
    if (U.sheetOpen) { closeSheet(true); return; }
    if (U.rid) closeRace(true);
  });
  function raceHead(r, race) {
    const t = now(), st = N.status(r, t), inf = D.info(r.nm);
    const tabs = RT.filter((x) => x[0] !== "result" || r.st === "result");
    return '<header class="rc-hd ' + surfCls(r) + '"><button class="rc-back" data-a="closeRace" aria-label="もどる">‹</button>' +
      '<div class="rc-ttl"><span class="g1">G1</span><b>' + esc(inf.alias || r.nm) + "</b></div>" + statusChip(st) + "</header>" +
      '<div class="rc-info ' + surfCls(r) + '"><div class="rc-i1">' + esc(N.dateStr(r.date)) + " " + esc(r.post || "") + " 発走・" + courseStr(r) + (race && race.dir ? "（" + esc(race.dir.replace(/\s*[A-D]$/, "")) + "）" : "") + "</div>" +
      '<div class="rc-i2">' + esc(r.cond || "") + "・" + esc(r.rule || "") + (race && race.heads ? "・" + race.heads + "頭" : "") + (race && race.prize ? "・本賞金 1着 " + esc(prizeStr(race.prize)) : "") +
      (race && race.weather ? "・天候 " + esc(race.weather) : "") + (race && race.going ? "・馬場 " + esc(N.going(race.going)) : "") + "</div>" + cdBlock(r, st) + "</div>" +
      '<nav class="rc-tabs">' + tabs.map((x) => '<button data-rt="' + x[0] + '" class="' + (U.rtab === x[0] ? "on" : "") + '">' + x[1] + "</button>").join("") + "</nav>";
  }
  function renderRace() {
    const el = $("#race"); if (!el || el.hidden) return;
    const r = raceOf(U.rid); if (!r) return;
    const race = U.race;
    if (U.rtab === "replay") U.rtab = "result";
    if (U.player) { U.player.destroy(); U.player = null; }
    const st = N.status(r, now());
    let body;
    if (!race) body = '<div class="empty"><div class="spin"></div><b>読みこんでいます…</b></div>';
    else if (U.rtab === "past") body = pastHTML(race);
    else if (U.rtab === "odds") body = oddsHTML(r, race);
    else if (U.rtab === "course") body = courseHTML(r, race);
    else if (U.rtab === "result") body = resultHTML(r, race);
    else body = cardHTML(r, race);
    el.innerHTML = raceHead(r, race) + '<div class="rc-body">' + body + "</div>" +
      (liveDay(r, st) ? '<div class="rc-live">' + liveBtn(false) + "</div>" : "") +
      (st === "sale" ? '<div class="rc-buy"><button class="btn pri big buy-go" data-bet="' + r.rid + '">馬券を買う（発売中）<small>締切 ' + esc(N.hm(N.closeAt(r))) + "（発走の2分前）</small></button></div>" : "");
    if (U.rtab === "course" && race) { const cv = $("#courseCv"); if (cv) requestAnimationFrame(() => RC.drawCourse(cv, Object.assign({}, r, race))); }
    fitSoon(el);   /* ★★ 2026-10-26 結果のタブの「このレースのあなたの馬券」も詰め字にする（前は測っていなかった） */
  }

  /* ── 出馬表 ── */
  function marksOf(rid) { const s = B.load(); return (s.mk && s.mk[rid]) || {}; }
  function cardHTML(r, race) {
    const ents = N.runners(race);
    if (!ents.length) return '<div class="empty"><b>出走馬はまだ決まっていません</b><p>出走登録（特別登録）は1週間前の日曜、枠順は木曜ごろに決まります。</p></div>';
    const mk = marksOf(r.rid);
    const drawn = ents.every((e) => e.cx || e.no);
    const kind = race.odds && race.odds.kind;
    let h = '<div class="card-note">' + (drawn ? "" : '<span class="chip st-entry">枠順確定前</span> 登録馬 ' + ents.length + "頭（フルゲートを超えるときは抽選・除外があります）") +
      (kind ? '<span class="sm">' + esc(N.oddsKindNm[kind] || "") + (race.odds.at ? " " + esc(String(race.odds.at).slice(5, 16)) : "") + "</span>" : "") + "</div>";
    h += '<div class="ent">' + ents.map((e) => {
      const hi = (race.horses || {})[e.hid] || {}, pf = hi.prof || {}, ped = hi.ped || [];
      const o = N.winOdds(race, e), bw = e.bw || (e.res && e.res.bw) || "";
      const m = mk[e.hid] || "";
      const silk = pf.oid ? '<img class="silk" src="' + esc(N.silk(pf.oid)) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '<span class="silk none"></span>';
      return '<div class="er' + (e.cx ? " cx" : "") + '">' +
        '<span class="er-w">' + (e.waku ? wakuChip(e.waku) : '<i class="wk dim">–</i>') + "</span>" +
        '<span class="er-no">' + (e.no ? noChip(e.no, e.waku) : '<b class="no dim">–</b>') + "</span>" +
        '<button class="er-mk" data-mk="' + esc(e.hid) + '" aria-label="印">' + (m ? esc(m) : '<i>印</i>') + "</button>" +
        silk +
        '<button class="er-nm" data-horse="' + esc(e.hid) + '"><b>' + esc(e.nm) + (e.cx ? ' <em class="cxl">取消</em>' : "") + "</b><small>" + esc(ped[0] ? "父 " + ped[0] + (ped[4] ? "・母父 " + ped[4] : "") : "") + "</small>" +
          '<small class="er-meta">' + esc([e.sa, e.kg, e.j, bw].filter(Boolean).join("・")) + "</small></button>" +
        '<span class="er-sa">' + esc(e.sa || "") + "<small>" + esc(e.kg || "") + "</small></span>" +
        '<span class="er-j">' + esc(e.j || "") + "<small>" + esc((e.trb ? e.trb.slice(0, 1) + "・" : "") + (e.tr || "")) + "</small></span>" +
        '<span class="er-bw">' + esc(bw.replace(/\(.*$/, "")) + "<small>" + esc((bw.match(/\(.*\)/) || [""])[0]) + "</small></span>" +
        '<span class="er-o">' + (o ? "<b>" + esc(o[0]) + "</b><small>" + esc(o[1]) + "人気</small>" : "<b>–</b>") + "</span></div>";
    }).join("") + "</div>";
    h += '<p class="sm pad">印（◎○▲△☆）は自分用のメモです（この端末とアカウントに保存）。馬名を押すとプロフィール・血統・近走が見られます。</p>';
    return h;
  }
  /* ── 馬柱 ── */
  function pastHTML(race) {
    const ents = N.runners(race).filter((e) => !e.cx);
    const hs = race.horses || {};
    if (!ents.length) return '<div class="empty"><b>出走馬はまだ決まっていません</b></div>';
    if (!Object.keys(hs).length) return '<div class="empty"><b>近走のデータはありません</b><p>確定前の GⅠ は出走馬の近走も集めています（確定後のレースは結果だけ）。</p></div>';
    return '<div class="past">' + ents.map((e) => {
      const hi = hs[e.hid] || {}, runs = (hi.runs || []).slice(0, 5);
      return '<div class="pr"><button class="pr-hd" data-horse="' + esc(e.hid) + '">' + (e.no ? noChip(e.no, e.waku) : "") + "<b>" + esc(e.nm) + "</b><small>" + esc(e.sa || "") + "・" + esc(e.j || "") + "</small></button>" +
        '<div class="pr-runs">' + (runs.length ? runs.map((x) => {
          const gm = String(x.race || "").match(/\((G[I]{1,3}|GⅠ|GⅡ|GⅢ|L|OP|[123]勝クラス|未勝利|新馬)\)/);
          return '<div class="run ' + posCls(x.pos) + '"><div class="run-d">' + esc(String(x.date || "").slice(2).replace(/\//g, ".")) + " " + esc(String(x.venue || "").replace(/^\d+/, "").replace(/\d+$/, "")) + "</div>" +
            '<div class="run-nm">' + esc(String(x.race || "").replace(/\(.*\)$/, "")) + (gm ? "<i>" + esc(gm[1].replace("GIII", "GⅢ").replace("GII", "GⅡ").replace("GI", "GⅠ")) + "</i>" : "") + "</div>" +
            '<div class="run-c">' + esc(x.dist || "") + " " + esc(x.going || "") + "</div>" +
            '<div class="run-p"><b>' + esc(x.pos || "") + "</b><small>" + esc(x.n || "") + "頭" + (x.pop ? "・" + esc(x.pop) + "人" : "") + "</small></div>" +
            '<div class="run-t">' + esc(x.time || "") + "<small>" + esc(x.mg || "") + "</small></div>" +
            '<div class="run-x">' + esc(x.pass || "") + (x.l3 ? "・" + esc(x.l3) : "") + "</div>" +
            '<div class="run-j">' + esc(String(x.j || "").slice(0, 4)) + " " + esc(x.kg || "") + "</div>" +
            '<div class="run-w">' + esc(x.win || "") + "</div></div>";
        }).join("") : '<div class="run none">データなし</div>') + "</div></div>";
    }).join("") + "</div>";
  }
  /* ── オッズ ── */
  const OT = [["win", "単勝・複勝"], ["waku", "枠連"], ["quin", "馬連"], ["wide", "ワイド"], ["exa", "馬単"], ["trio", "3連複"], ["tri", "3連単"]];
  function oddsHTML(r, race) {
    const kind = race.odds && race.odds.kind;
    let h = '<div class="seg otype">' + OT.map((x) => '<button data-ot="' + x[0] + '" class="' + (U.otype === x[0] ? "on" : "") + '">' + x[1] + "</button>").join("") + "</div>";
    if (r.st === "result") h += '<p class="sm pad">確定したレースです。払戻金は「結果」タブに出ています。</p>';
    if (U.otype === "win") {
      const ents = N.runners(race);
      if (!race.odds) return h + '<div class="empty sm"><b>オッズはまだありません</b></div>';
      h += '<p class="sm pad">' + esc(N.oddsKindNm[kind] || "") + (race.odds.at ? "・" + esc(race.odds.at) + " 時点" : "") + "（自動取得のときの値です。払い戻しは確定の払戻金）</p>";
      h += '<div class="tbl-wrap"><table class="tbl odds"><thead><tr><th>馬</th><th>馬名</th><th>単勝</th><th>複勝</th><th>人気</th></tr></thead><tbody>' +
        ents.filter((e) => !e.cx).map((e) => { const o = N.winOdds(race, e), p = N.placeOdds(race, e); return "<tr><td>" + (e.no ? noChip(e.no, e.waku) : "–") + "</td><td>" + esc(e.nm) + '</td><td class="num">' + (o ? esc(o[0]) : "–") + '</td><td class="num">' + (p ? esc(p[0]) + "–" + esc(p[1]) : "–") + '</td><td class="num">' + (o ? esc(o[1]) : "") + "</td></tr>"; }).join("") + "</tbody></table></div>";
      return h;
    }
    const ex = U.ex;
    if (!ex || !ex[U.otype]) return h + '<div class="empty sm"><b>' + esc(OT.find((x) => x[0] === U.otype)[1]) + " のオッズは、発売の前日から出ます</b><p>単勝・複勝はいつでも見られます。</p></div>";
    const T = B.TYPE[U.otype], rows = ex[U.otype];
    const ents = N.runners(race), nm = {}; ents.forEach((e) => { nm[e.no] = e; });
    const ax = U.oaxis;
    h += '<div class="oaxis"><span>軸：</span><button data-oax="0" class="' + (!ax ? "on" : "") + '">人気順</button>' + (T.frame ? [1, 2, 3, 4, 5, 6, 7, 8] : ents.filter((e) => !e.cx && e.no).map((e) => e.no)).map((n) => '<button data-oax="' + n + '" class="' + (ax === n ? "on" : "") + '">' + (T.frame ? wakuChip(n) : noChip(n, (nm[n] || {}).waku)) + "</button>").join("") + "</div>";
    const L = rows.filter((x) => !ax || x.slice(0, T.n).indexOf(ax) >= 0).slice(0, ax ? 400 : 60);
    h += '<p class="sm pad">' + esc(N.oddsKindNm[ex.kind] || "") + (ex.at ? "・" + esc(ex.at) + " 時点" : "") + "・" + (ax ? "その馬を含む組み合わせ" : "人気の上位60") + "</p>";
    h += '<div class="olist">' + L.map((x) => {
      const c = x.slice(0, T.n), o = U.otype === "wide" ? x[T.n].toFixed(1) + "–" + x[T.n + 1].toFixed(1) : x[T.n].toFixed(1), pop = x[x.length - 1];
      return '<div class="oi"><span class="oi-c">' + c.map((n, i) => (i ? '<em>' + (T.ord ? "→" : "-") + "</em>" : "") + (T.frame ? wakuChip(n) : noChip(n, (nm[n] || {}).waku))).join("") + '</span><b class="oi-o">' + esc(o) + '</b><small class="oi-p">' + esc(pop) + "人気</small></div>";
    }).join("") + "</div>";
    return h;
  }
  /* ── コース ── */
  function courseHTML(r, race) {
    const C = D.COURSES[r.place] || {};
    const lay = RC.layout(Object.assign({}, r, race));
    return '<div class="card"><canvas id="courseCv" class="course-cv"></canvas>' +
      '<div class="cfacts"><span><small>競馬場</small><b>' + esc(r.place) + "</b></span><span><small>コース</small><b>" + esc(r.surf + r.dist) + "m</b></span><span><small>回り</small><b>" + (lay.left ? "左" : "右") + (lay.outer ? "・外" : "") + "</b></span>" +
      "<span><small>直線</small><b>" + Math.round(lay.S) + "m</b></span><span><small>1周</small><b>" + Math.round(lay.L) + "m</b></span><span><small>高低差</small><b>" + esc(C.rise || "") + "m</b></span></div>" +
      '<p class="ctext"><b>' + esc(C.slope || "") + "</b><br>" + esc(C.note || "") + "</p>" + (D.info(r.nm).tag ? '<p class="ctext"><b>このレース</b><br>' + esc(D.info(r.nm).tag) + "</p>" : "") +
      '<p class="sm">コースの形は「1周の長さ・直線の長さ」から作った目安の図です。</p></div>';
  }
  /* ── 結果 ── */
  function myTicketsFor(rid) { return Object.values(B.load().tk).filter((t) => t.rid === rid).sort((a, b) => (b.at || 0) - (a.at || 0)); }
  /* ★★ 2026-10-26（2回目）ご指定「5位以下もボタンを押して表示」：ふだんは5着まで、ボタンで全頭。
     結果が速報（上位だけ）のときは、残りの馬を名前だけ出して「全頭の着順はデータが届きしだい」 */
  function resMoreHTML(r, race) {
    const rows = race.result.rows || [], open = !!U.resAll[r.rid], part = N.partial(race);
    const rest = part ? N.runners(race).filter((e) => !e.res && !e.cx) : [];
    const more = Math.max(0, rows.length - 5) + rest.length;
    if (!more && !open) return "";
    let h = "";
    if (open && rest.length) h += '<div class="res-rest"><p>⏳ 6着以下の着順は、結果のデータがそろいしだい出ます（' + PAY_NOTE + '）。</p><div>' + rest.map((e) => '<span>' + noChip(e.no, e.waku) + esc(e.nm) + "</span>").join("") + "</div></div>";
    return h + '<button class="btn res-more" data-a="resAll">' + (open ? "▲ 5着までにもどす" : "▼ 6着以下も見る（あと " + more + " 頭）") + "</button>";
  }
  function resultHTML(r, race) {
    const res = race.result;
    if (!res) return '<div class="empty"><b>まだ確定していません</b></div>';
    const P = res.pay || {};
    let h = videoBtns(r, race) +
      '<div class="tbl-wrap"><table class="tbl res"><thead><tr><th>着</th><th>馬</th><th>馬名</th><th>騎手</th><th>タイム</th><th>着差</th><th>通過</th><th>上り</th><th>人気</th><th>体重</th></tr></thead><tbody>' +
      (U.resAll[r.rid] ? res.rows : res.rows.slice(0, 5)).map((x) => '<tr class="' + posCls(x.pos) + '"><td class="pos">' + esc(x.pos) + "</td><td>" + noChip(x.no, x.waku) + '</td><td><button class="lk" data-horse="' + esc(x.hid) + '">' + esc(x.nm) + "</button><small>" + esc(x.sa) + " " + esc(x.kg || "") + "</small></td><td>" + esc(x.j) + '</td><td class="num">' + esc(x.time) + "</td><td>" + esc(mgStr(x.mg)) + '</td><td class="num">' + esc(x.pass) + '</td><td class="num">' + esc(x.l3 || "") + '</td><td class="num">' + esc(x.pop || "") + "<small>" + esc(x.odds || "") + '</small></td><td class="num">' + esc(x.bw) + "</td></tr>").join("") + "</tbody></table></div>" + resMoreHTML(r, race);
    h += '<section class="card pays"><h3>払戻金<small>100 XEVA あたり（＝実際の払戻金）</small></h3>' + B.TYPES.map((T) => {
      const L = P[T.k]; if (!L) return "";
      return '<div class="pay"><span class="pay-t">' + T.nm + "</span><div>" + L.map((x) => '<div class="pay-r"><span class="pay-c">' + x.c.map((n, i) => (i ? "<em>" + (T.ord ? "→" : "-") + "</em>" : "") + (T.frame ? wakuChip(n) : noChip(n, (res.rows.find((y) => y.no === n) || {}).waku))).join("") + '</span><b>' + yen(x.y) + '</b><small>' + esc(x.pop || "") + "人気</small></div>").join("") + "</div></div>";
    }).join("") + "</section>";
    const mine = myTicketsFor(r.rid);
    if (mine.length) h += '<section class="card"><h3>このレースのあなたの馬券</h3><div class="tks">' + mine.map(ticketHTML).join("") + "</div></section>";
    if (res.laps && res.laps.rows && res.laps.rows.length) {
      const d = res.laps.d || [], cum = res.laps.rows[0] || [], sp = res.laps.rows[1] || [];
      h += '<section class="card"><h3>ラップ<small>' + esc(D.PACE_NM[res.pace] || "") + "</small></h3>" + '<div class="laps">' + d.map((x, i) => "<div><small>" + esc(x) + "m</small><b>" + esc(sp[i] || "") + "</b><i>" + esc(cum[i] || "") + "</i></div>").join("") + "</div></section>";
    }
    if (res.corners && res.corners.some((c) => c.s)) h += '<section class="card"><h3>コーナー通過順位</h3>' + res.corners.filter((c) => c.s).map((c) => '<div class="corner"><b>' + c.k + "角</b><span>" + esc(c.s) + "</span></div>").join("") + '<p class="sm">「,」1〜2馬身・「-」2〜5馬身・「=」5馬身以上・( ) は1馬身未満で並走（内から）</p></section>';
    return h;
  }

  /* ══════════ 馬のくわしい情報（シート）══════════ */
  function openHorse(hid) {
    const race = U.race; if (!race) return;
    const e = N.runners(race).find((x) => x.hid === hid) || {};
    const hi = (race.horses || {})[hid] || {}, pf = hi.prof || {}, ped = hi.ped || [], runs = hi.runs || [];
    const row = (k, v) => (v ? "<tr><th>" + k + "</th><td>" + esc(v) + "</td></tr>" : "");
    const h = '<div class="sh-hd"><b>' + esc(e.nm || "") + '</b><button class="sh-x" data-a="closeSheet" aria-label="閉じる">✕</button></div><div class="sh-body">' +
      '<div class="hz">' + (pf.oid ? '<img class="silk big" src="' + esc(N.silk(pf.oid)) + '" alt="勝負服">' : "") + "<div><b>" + esc(pf.title || e.sa || "") + "</b><small>" + esc(e.j ? "騎手 " + e.j : "") + (e.no ? "・" + e.no + "番" : "") + "</small></div></div>" +
      '<table class="kv">' + row("生年月日", pf.birth) + row("調教師", pf.trainer || e.tr) + row("馬主", pf.owner) + row("生産者", pf.breeder) + row("産地", pf.area) + row("獲得賞金（中央）", pf.prize) + row("通算成績", pf.rec) + row("主な勝鞍", pf.best) + "</table>" +
      (ped.length >= 6 ? '<h4>血統</h4><table class="ped"><tr><td rowspan="2" class="m">父<b>' + esc(ped[0]) + "</b></td><td>父父 " + esc(ped[1]) + "</td></tr><tr><td>父母 " + esc(ped[2]) + '</td></tr><tr><td rowspan="2" class="f">母<b>' + esc(ped[3]) + "</b></td><td>母父 " + esc(ped[4]) + "</td></tr><tr><td>母母 " + esc(ped[5]) + "</td></tr></table>" : "") +
      (runs.length ? '<h4>近走</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>日付</th><th>レース</th><th>距離</th><th>着</th><th>人気</th><th>騎手</th><th>タイム</th><th>上り</th></tr></thead><tbody>' +
        runs.map((x) => '<tr class="' + posCls(x.pos) + '"><td>' + esc(String(x.date || "").slice(2)) + "</td><td>" + esc(x.race || "") + "<small>" + esc(x.venue || "") + "</small></td><td>" + esc(x.dist || "") + " " + esc(x.going || "") + '</td><td class="pos">' + esc(x.pos || "") + "</td><td>" + esc(x.pop || "") + "</td><td>" + esc(x.j || "") + "</td><td>" + esc(x.time || "") + "</td><td>" + esc(x.l3 || "") + "</td></tr>").join("") + "</tbody></table></div>" : "") +
      '<p class="sm">データ：netkeiba。<a href="https://db.netkeiba.com/horse/' + esc(hid) + '/" target="_blank" rel="noopener">netkeiba でくわしく見る ↗</a></p></div>';
    openSheet(h, "horse");
  }

  /* ══════════ シート ══════════ */
  /* ★★ 2026-10-24 ご報告「馬券を買う画面でスクロールすると後ろの画面がスクロールされる」
     → シートのあいだは後ろ（文書）を止める（body を fixed にして位置を覚える・閉じたら戻す）。
       中のスクロールは .sh-body の overscroll-behavior:contain で外へ伝えない（md.css）。 */
  let lockY = null;
  function lockBg(on) {
    const b = document.body;
    if (on) { if (lockY != null) return; lockY = window.scrollY || 0; b.style.position = "fixed"; b.style.top = -lockY + "px"; b.style.left = "0"; b.style.right = "0"; b.classList.add("noscroll"); }
    else { if (lockY == null) return; const y = lockY; lockY = null; b.style.position = ""; b.style.top = ""; b.style.left = ""; b.style.right = ""; b.classList.remove("noscroll"); window.scrollTo(0, y); }
  }
  function openSheet(html, kind) {
    const sh = $("#sheet");
    lockBg(true);
    sh.innerHTML = '<div class="sh-bg" data-a="closeSheet"></div><div class="sh-pane ' + (kind || "") + '">' + html + "</div>";
    sh.classList.add("on");
    if (!U.sheetOpen) { try { history.pushState({ md: "sheet" }, ""); } catch (e) {} }
    U.sheetOpen = true;
  }
  function closeSheet(fromPop) {
    const sh = $("#sheet"); sh.classList.remove("on"); sh.innerHTML = "";
    const was = U.sheetOpen;
    U.slip = null; U.sheetOpen = false; U.tkOpen = null;
    lockBg(false);
    if (!fromPop && was) { try { if (history.state && history.state.md === "sheet") { ignorePop++; history.back(); } } catch (e) {} }
  }

  /* ══════════ 馬券を買う（スリップ）══════════ */
  async function openSlip(rid) {
    const r = raceOf(rid); if (!r) return;
    let race = U.rid === rid && U.race ? U.race : N.peekRace(rid);
    if (!race || r.st !== "result") { try { race = await N.race(rid, false, true); } catch (e) {} }
    if (!race) { toast("出馬表を読めませんでした", "err"); return; }
    B.fixAll(rid, race);
    /* ★★ 2026-10-24 枠順の発表前は仮の番号の写し（N.betRace）で買う。オッズはまだ無い */
    race = N.betRace(race);
    U.slip = { rid: rid, race: race, ex: U.rid === rid && !race.pre ? U.ex : null, type: "win", mode: "norm", cols: [[], [], []], pick: [], axis: [], part: [], pos: "1", u: 100, lines: [] };
    openSheet('<div id="slip"></div>', "slip");
    paintSlip();
    if (!race.pre) N.odds(rid).then((ex) => { if (U.slip && U.slip.rid === rid) { U.slip.ex = ex; paintSlip(); } }).catch(() => {});
  }
  /* 枠順の発表前の組を馬名で（"ダノン−ロブチェン"） */
  function preStr(race, type, c) { const nm = (p) => { const e = (race.entries || []).find((x) => x.pno === p); return e ? e.nm : "?"; }; return c.map(nm).join(B.TYPE[type].ord ? "→" : "−"); }
  function slipCombos() {
    const S = U.slip; if (!S) return [];
    const sel = S.mode === "box" ? { pick: S.pick } : S.mode === "nag" ? { axis: S.axis, part: S.part, pos: S.pos } : { cols: S.cols };
    let cb = B.expand(S.type, S.mode, sel);
    if (S.race) cb = cb.filter((c) => B.comboOk(S.race, S.type, c));
    return cb.slice(0, D.MAX_COMBOS);
  }
  function slipSel() { const S = U.slip; return S.mode === "box" ? { pick: S.pick.slice() } : S.mode === "nag" ? { axis: S.axis.slice(), part: S.part.slice(), pos: S.pos } : { cols: S.cols.map((c) => c.slice()) }; }
  function gridHTML(key, sel, multi, frame) {
    const race = U.slip.race, ents = N.runners(race).filter((e) => !e.cx && e.no);
    if (frame) {
      const fr = {}; ents.forEach((e) => { (fr[e.waku] = fr[e.waku] || []).push(e); });
      return '<div class="grid fr">' + [1, 2, 3, 4, 5, 6, 7, 8].filter((w) => fr[w]).map((w) => '<button class="gb' + (sel.indexOf(w) >= 0 ? " on" : "") + '" data-pk="' + key + ":" + w + '">' + wakuChip(w) + "<small>" + fr[w].map((e) => esc(e.nm.slice(0, 5))).join("<br>") + "</small></button>").join("") + "</div>";
    }
    return '<div class="grid">' + ents.map((e) => { const o = race.pre ? null : N.winOdds(race, e); return '<button class="gb' + (sel.indexOf(e.no) >= 0 ? " on" : "") + '" data-pk="' + key + ":" + e.no + '">' + (race.pre ? '<b class="no pre">?</b>' : noChip(e.no, e.waku)) + "<span>" + esc(e.nm) + "</span><small>" + (o ? esc(o[0]) : "") + "</small></button>"; }).join("") + "</div>";
  }
  function paintSlip() {
    const S = U.slip, box = $("#slip"); if (!S || !box) return;
    /* ★★ 2026-10-26 ご報告「馬券購入で値段を押すたびに画面上部に戻される」：中身を描き直すと .sh-body のスクロールが 0 に戻っていた → 位置を覚えて戻す */
    const sb0 = box.querySelector(".sh-body"), keepY = sb0 ? sb0.scrollTop : 0;
    const r = raceOf(S.rid), race = S.race, T = B.TYPE[S.type];
    const t = now(), st = N.status(r, t);
    const modes = T.n === 1 ? [["norm", "通常"]] : [["norm", "通常"], ["box", "ボックス"], ["nag", "ながし"], ["form", "フォーメーション"]];
    if (!modes.some((m) => m[0] === S.mode)) S.mode = "norm";
    let picks = "";
    const lab = T.ord ? ["1着", "2着", "3着"] : T.frame ? ["枠", "枠", "枠"] : ["1頭目", "2頭目", "3頭目"];
    if (T.n === 1) picks = '<div class="pick-h">馬をえらぶ<small>何頭でも（1頭ずつ別の買い目）</small></div>' + gridHTML("c0", S.cols[0], true);
    else if (S.mode === "norm") for (let i = 0; i < T.n; i++) picks += '<div class="pick-h">' + lab[i] + "</div>" + gridHTML("n" + i, S.cols[i], false, T.frame);
    else if (S.mode === "box") picks = '<div class="pick-h">' + (T.frame ? "枠" : "馬") + "をえらぶ<small>えらんだもののすべての組み合わせ</small></div>" + gridHTML("bx", S.pick, true, T.frame);
    else if (S.mode === "form") for (let i = 0; i < T.n; i++) picks += '<div class="pick-h">' + lab[i] + "<small>何頭でも</small></div>" + gridHTML("f" + i, S.cols[i], true, T.frame);
    else {
      const two = T.n === 3 && S.axis.length >= 2;
      const posOpts = !T.ord ? [] : T.n === 2 ? [["1", "1着"], ["2", "2着"], ["m", "マルチ"]] : two ? [["12", "1・2着"], ["13", "1・3着"], ["23", "2・3着"], ["m", "マルチ"]] : [["1", "1着"], ["2", "2着"], ["3", "3着"], ["m", "マルチ"]];
      if (posOpts.length && !posOpts.some((p) => p[0] === S.pos)) S.pos = posOpts[0][0];
      picks = '<div class="pick-h">軸' + (T.n === 3 ? "<small>1頭か2頭</small>" : "") + "</div>" + gridHTML("ax", S.axis, T.n === 3, T.frame) +
        (posOpts.length ? '<div class="seg sm">' + posOpts.map((p) => '<button data-pos="' + p[0] + '" class="' + (S.pos === p[0] ? "on" : "") + '">軸 ' + p[1] + "</button>").join("") + "</div>" : "") +
        '<div class="pick-h">相手<small>何頭でも</small></div>' + gridHTML("pt", S.part, true, T.frame);
    }
    const cb = slipCombos();
    const ex = S.ex;
    let orng = "";
    if (cb.length) {
      const os = cb.map((c) => B.oddsOf(race, ex, S.type, c)).filter((o) => o).map((o) => (Array.isArray(o) ? o[0] : o));
      if (os.length) orng = "オッズ " + Math.min.apply(null, os).toFixed(1) + (os.length > 1 ? "〜" + Math.max.apply(null, os).toFixed(1) : "") + " 倍";
    }
    const lineCost = cb.length * S.u, total = S.lines.reduce((a, l) => a + l.cb.length * l.u, 0);
    let bal = 0; try { bal = window.XEVA.getBalance(); } catch (e) {}
    const spent = B.raceSpent(S.rid);
    box.innerHTML =
      '<div class="sh-hd"><b>馬券を買う<small>' + esc(D.shortName(r.nm)) + " " + esc(N.dateStr(r.date)) + " " + esc(r.post) + '発走</small></b><button class="sh-x" data-a="closeSheet" aria-label="閉じる">✕</button></div>' +
      '<div class="sh-body slip">' +
      (race.pre && st === "sale" ? '<div class="warn pre">🕘 <b>枠順の発表前</b>です。馬名で買えます（馬番は「?」・発表されしだい券に本当の馬番が入ります）。発表までに出走しなくなった馬を含む組は返還。枠連とオッズは枠順が出てから。</div>' : "") +
      (st !== "sale" ? '<div class="warn">' + (st === "entry" ? "発売は " + esc(N.dtStr(N.saleAt(r))) + " から" : st === "pre" ? "発売は " + esc(N.dtStr(N.saleAt(r))) + " から（あと <b data-cd=\"" + N.saleAt(r) + "\">" + N.left(N.saleAt(r) - t) + "</b>）。買い目は先に作っておけます" : st === "gap" ? "前日発売は終わりました。当日発売は " + esc(N.dtStr(N.nextSaleAt(r, t) || N.closeAt(r))) + " から（JRA と同じ時間）。買い目は先に作っておけます" : "このレースの発売は終わりました（締切は発走の2分前）") + "</div>" : '<div class="slip-cd">締切まで <b data-cd="' + N.closeAt(r) + '">' + N.left(N.closeAt(r) - t) + "</b><small>（" + esc(N.hm(N.closeAt(r))) + "・サーバーの時刻）</small></div>") +
      '<div class="types">' + B.TYPES.filter((x) => !(race.pre && x.frame)).map((x) => '<button data-ty="' + x.k + '" class="' + (S.type === x.k ? "on" : "") + '"><b>' + x.nm + "</b></button>").join("") + "</div>" +
      '<p class="tdesc">' + esc(T.d) + '<button class="tdesc-q" data-a="helpTypes">？ 馬券の種類</button></p>' +
      (modes.length > 1 ? '<div class="seg modes">' + modes.map((m) => '<button data-md="' + m[0] + '" class="' + (S.mode === m[0] ? "on" : "") + '">' + m[1] + "</button>").join("") + "</div>" : "") +
      picks +
      '<div class="amt"><div class="amt-c"><span>' + cb.length + "点</span>" + (orng ? "<small>" + esc(orng) + "</small>" : "") + "</div>" +
        '<div class="amt-u"><button data-u="-">−</button><b>' + fmt(S.u) + '</b><button data-u="+">＋</button><span>XEVA/点</span></div>' +
        /* ★★ 2026-10-26 ご指定「値段を押したときプラスされる形に・リセットボタンも」 */
        '<div class="amt-q">' + [100, 500, 1000, 5000].map((v) => '<button data-uq="' + v + '">＋' + fmt(v) + "</button>").join("") + '<button class="rs" data-ur="1">リセット</button></div>' +
        '<button class="btn add" data-a="addLine" ' + (cb.length && S.u >= D.UNIT ? "" : "disabled") + ">" + (S.u >= D.UNIT ? "買い目に追加（" + fmt(lineCost) + " XEVA）" : "金額を入れてください（1点 " + fmt(D.UNIT) + " XEVA から）") + "</button></div>" +
      (S.lines.length ? '<div class="lines"><div class="pick-h">買い目<small>' + S.lines.length + "件</small></div>" + S.lines.map((l, i) => '<div class="ln"><span><b>' + esc(B.lineLabel(l)) + "</b><small>" + esc(l.cb.slice(0, 6).map((c) => race.pre ? preStr(race, l.type, c) : B.comboStr(l.type, c)).join(" ") + (l.cb.length > 6 ? " …" : "")) + "</small></span><em>" + l.cb.length + "点×" + fmt(l.u) + "</em><b>" + fmt(l.cb.length * l.u) + '</b><button data-del="' + i + '" aria-label="消す">✕</button></div>').join("") + "</div>" : "") +
      '<div class="buy"><div><small>合計</small><b>' + fmt(total) + ' XEVA</b><small>残高 ' + fmt(bal) + (spent ? "・このレースで " + fmt(spent) + " 購入ずみ" : "") + "</small></div>" +
        '<button class="btn pri big" data-a="buy" ' + (S.lines.length && st === "sale" ? "" : "disabled") + ">購入する</button></div>" +
      '<p class="sm">1点 100 XEVA から。払い戻しは実際の払戻金（100円あたり）どおり。1レース ' + fmt(D.MAX_PER_RACE) + " XEVA まで。結果と払い戻しはデータが届きしだい（" + PAY_NOTE + "）。</p></div>";
    const sb1 = box.querySelector(".sh-body"); if (sb1 && keepY) sb1.scrollTop = keepY;
  }
  function slipPick(key, v) {
    const S = U.slip, T = B.TYPE[S.type];
    const tog = (arr, x, single) => { const i = arr.indexOf(x); if (i >= 0) arr.splice(i, 1); else { if (single) arr.length = 0; arr.push(x); } };
    if (key === "c0") tog(S.cols[0], v, false);
    else if (key[0] === "n") tog(S.cols[Number(key[1])], v, true);
    else if (key[0] === "f") tog(S.cols[Number(key[1])], v, false);
    else if (key === "bx") tog(S.pick, v, false);
    else if (key === "ax") { const i = S.axis.indexOf(v); if (i >= 0) S.axis.splice(i, 1); else { if (S.axis.length >= (T.n === 3 ? 2 : 1)) S.axis.shift(); S.axis.push(v); } const j = S.part.indexOf(v); if (j >= 0 && !T.frame) S.part.splice(j, 1); }
    else if (key === "pt") { if (!T.frame && S.axis.indexOf(v) >= 0) return; tog(S.part, v, false); }
    paintSlip();
  }
  async function doBuy() {
    const S = U.slip; if (!S || !S.lines.length) return;
    const r = raceOf(S.rid);
    const total = S.lines.reduce((a, l) => a + l.cb.length * l.u, 0);
    if (!confirmBox("合計 " + fmt(total) + " XEVA")) return;
    const btn = $('[data-a="buy"]'); if (btn) { btn.disabled = true; btn.textContent = "時刻を確かめています…"; }
    const res = await B.buy(r, S.race, S.lines);
    if (res.ok) {
      closeSheet();
      toast("🎫 購入しました：" + res.tickets.length + "件・" + fmt(res.cost) + " XEVA", "ok");
      paintHead(); render(); if (U.rid) renderRace();
      return;
    }
    const msg = { offline: "オフラインのため買えません（締切をサーバーの時刻で確かめる必要があります）", closed: "締切を過ぎています（締切は発走の2分前）", nodraw: "枠順が決まるまで買えません",
      notyet: "いまは発売していません（発売はレースの日の" + (D.SALE_DAYS_BEFORE || 3) + "日前の 0:00 から・締切は発走の2分前）",
      balance: "XEVA が足りません（必要 " + fmt(res.cost || 0) + "・残高 " + fmt(res.bal || 0) + "）", cap: "1レースで買えるのは " + fmt(D.MAX_PER_RACE) + " XEVA までです", invalid: "出走しない馬（取消・除外）を含む買い目があります", empty: "買い目がありません" }[res.err] || "購入できませんでした";
    toast(msg, "err");
    paintSlip();
  }
  /* confirm() が出ない環境があるので（MagiLex・MagiTier で踏んだ罠）、購入は「2回押し」で確かめる */
  function confirmBox(msg) {
    const btn = $('[data-a="buy"]');
    if (btn && btn.dataset.arm !== "1") { btn.dataset.arm = "1"; btn.textContent = "もう一度押すと購入（" + msg.replace(/[^0-9,]/g, "") + " XEVA）"; btn.classList.add("arm"); setTimeout(() => { if (btn.isConnected) { btn.dataset.arm = ""; btn.textContent = "購入する"; btn.classList.remove("arm"); } }, 6000); return false; }
    return true;
  }

  /* ══════════ 精算と的中の演出 ══════════ */
  /* ★★ 2026-10-24 結果が出た馬券は「計算だけ」して、押して確認してもらう（払い戻しは確認したとき） */
  async function settle() {
    const done = await B.settle();
    if (!done.length) return;
    paintHead(); render(); if (U.rid) renderRace();
    toast("🎫 結果が出ました：" + done.length + "枚の馬券を「馬券」タブで押して確認できます", "ok");
  }

  /* ══════════ 読みこみ・定期の更新 ══════════ */
  async function loadIndex(force) {
    try {
      const idx = await N.index(force);
      const changed = !U.idx || U.idx.at !== idx.at;
      U.idx = idx; U.err = "";
      if (changed) { U.data = null; render(); if (U.rid) { const r = raceOf(U.rid); try { U.race = await N.race(U.rid, r && r.st === "result", true); } catch (e) {} renderRace(); } }
      /* ★★ 2026-10-24 枠順の発表前に買った券：枠順が出ていたら本当の馬番へ差し替え */
      B.fixPending(idx).then((k) => { if (k) { render(); toast("🎫 枠順が発表されました。馬券に馬番を入れました（" + k + "件）", "ok"); } }).catch(() => {});
      settle();
    } catch (e) {
      if (!U.idx) { U.err = e && e.code === "nodata" ? "まだデータがありません（自動取得の初回を待っています）" : "通信できませんでした"; render(); }
    }
  }
  function tick() {
    const t = now();
    $$("[data-cd]").forEach((el) => { el.textContent = N.left(Number(el.getAttribute("data-cd")) - t); });
    paintHead();
    /* ★★ 2026-10-21 払い戻しはレースの次の日の 0:00 → その時刻を過ぎたら精算する（10秒に1回まで）
       ★★ 2026-10-26 ご指定で待たない（N.payAt＝発走の時刻）＝結果のデータが届いていれば精算 */
    if (U.idx && (!U.lastSettle || t - U.lastSettle > 10000)) {
      const open = Object.values(B.load().tk).some((k) => { if (k.st !== "open") return false; const rr = raceOf(k.rid); return rr && rr.st === "result" && t >= N.payAt(rr); });   /* ready は押したときに払い戻すので数えない */
      if (open) { U.lastSettle = t; settle(); }
    }
    /* 状態が変わったら描きなおす（締切・発走） */
    if (U.idx) {
      const sig = (U.idx.races || []).map((r) => N.status(r, t)).join("");
      if (sig !== U.lastSt) { const first = !U.lastSt; U.lastSt = sig; if (!first) { render(); if (U.rid && U.rtab !== "replay") renderRace(); if (U.slip) paintSlip(); } }
    }
  }

  /* ══════════ 操作 ══════════ */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-a],[data-tab],[data-race],[data-rt],[data-bet],[data-horse],[data-mk],[data-ot],[data-oax],[data-tkf],[data-tkr],[data-tkt],[data-tks],[data-ty],[data-md],[data-pk],[data-pos],[data-u],[data-uq],[data-ur],[data-del],[data-tk],[data-rv]");
    if (!a) return;
    const d = a.dataset;
    /* ★★ 2026-10-24 馬券：券を押す＝くわしく（結果ありなら確認）／確認する／まとめて確認 */
    if (d.tk) { openTicket(d.tk); return; }
    if (d.rv) { revealOne(d.rv); return; }
    if (d.a === "rvAll") { revealAll(); return; }
    if (d.a === "mypage") { openMyPage(); return; }
    /* ★★ 2026-10-26 使い方（アニメ）・馬券の種類（md-help.js） */
    if (d.a === "help" || d.a === "helpTypes") { if (window.MD_HELP) window.MD_HELP.open(d.a === "help" ? "howto" : "types"); return; }
    if (d.a === "myTickets") { closeSheet(); U.tab = "tickets"; U.tkf = "all"; render(); window.scrollTo(0, 0); return; }
    if (d.a === "reload") { U.err = ""; render(); loadIndex(true); return; }
    if (d.a === "closeRace") { closeRace(); return; }
    if (d.a === "closeSheet") { closeSheet(); return; }
    if (d.a === "closeFx") { const f = a.closest(".winfx"); if (f) f.remove(); return; }
    if (d.a === "addLine") {
      const S = U.slip, cb = slipCombos(); if (!cb.length || S.u < D.UNIT) return;
      S.lines.push({ type: S.type, mode: S.mode, sel: slipSel(), cb: cb, u: S.u });
      S.cols = [[], [], []]; S.pick = []; S.axis = []; S.part = [];
      paintSlip(); return;
    }
    if (d.a === "buy") { doBuy(); return; }
    if (d.tab != null && !a.closest(".rc-tabs")) { U.tab = d.tab; try { sessionStorage.setItem("md_tab", U.tab); } catch (e2) {} window.scrollTo(0, 0); render(); return; }
    if (d.bet) { openSlip(d.bet); return; }
    if (d.race && !a.closest("#race .rc-tabs")) { if (U.tkOpen) closeSheet(); openRace(d.race, d.rt); return; }
    if (d.rt && U.rid) { U.rtab = d.rt; renderRace(); const b = $("#race .rc-body"); if (b) b.scrollTop = 0; $("#race").scrollTop = 0; return; }
    if (d.horse) { openHorse(d.horse); return; }
    if (d.mk) {
      const s = B.load(); s.mk = s.mk || {}; const m = (s.mk[U.rid] = s.mk[U.rid] || {});
      const order = ["", "◎", "○", "▲", "△", "☆", "消"]; const i = order.indexOf(m[d.mk] || ""); const nx = order[(i + 1) % order.length];
      if (nx) m[d.mk] = nx; else delete m[d.mk];
      B.save(s); renderRace(); return;
    }
    if (d.ot) { U.otype = d.ot; U.oaxis = 0; renderRace(); return; }
    if (d.oax != null) { U.oaxis = Number(d.oax); renderRace(); return; }
    if (d.a === "tkFilter") { openTkFilter(); return; }
    if (d.a === "tkSort") { openTkSort(); return; }
    if (d.a === "tkReady") { U.tkf = "ready"; render(); return; }
    if (d.a === "tkClear") { U.tkf = "all"; U.tkr = ""; U.tkt = ""; render(); openTkFilter(); return; }
    if (d.a === "resAll") { U.resAll[U.rid] = !U.resAll[U.rid]; if (U.resAll[U.rid] && U.race && N.partial(U.race)) N.race(U.rid, true, true).then((x) => { U.race = x; renderRace(); }).catch(() => {}); renderRace(); return; }
    if (d.tkf) { U.tkf = d.tkf; render(); if (U.sheetOpen) openTkFilter(); return; }
    if (d.tkr != null) { U.tkr = d.tkr; render(); if (U.sheetOpen) openTkFilter(); return; }
    if (d.tkt != null) { U.tkt = d.tkt; render(); if (U.sheetOpen) openTkFilter(); return; }
    if (d.tks) { U.tks = d.tks; closeSheet(); render(); return; }
    if (!U.slip) return;
    if (d.ty) { U.slip.type = d.ty; U.slip.cols = [[], [], []]; U.slip.pick = []; U.slip.axis = []; U.slip.part = []; paintSlip(); return; }
    if (d.md) { U.slip.mode = d.md; U.slip.cols = [[], [], []]; U.slip.pick = []; U.slip.axis = []; U.slip.part = []; paintSlip(); return; }
    if (d.pk) { const p = d.pk.split(":"); slipPick(p[0], Number(p[1])); return; }
    if (d.pos) { U.slip.pos = d.pos; paintSlip(); return; }
    if (d.u) { const v = U.slip.u; U.slip.u = d.u === "+" ? Math.min(D.MAX_PER_RACE, v + (v >= 1000 ? 500 : 100)) : Math.max(0, v - (v > 1000 ? 500 : 100)); paintSlip(); return; }
    /* ★★ 2026-10-26 金額のボタンは押すたびに足す（ご指定）・リセットで 0 */
    if (d.uq) { U.slip.u = Math.min(D.MAX_PER_RACE, (U.slip.u || 0) + Number(d.uq)); paintSlip(); return; }
    if (d.ur) { U.slip.u = 0; paintSlip(); return; }
    if (d.del != null) { U.slip.lines.splice(Number(d.del), 1); paintSlip(); return; }
  });
  window.addEventListener("xeva:change", paintHead);
  window.addEventListener("md:save", () => { if (U.tab === "tickets" || B.readyList().length) render(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { loadIndex(true); settle(); } });

  /* ══════════ はじめ ══════════ */
  function boot() {
    U.idx = N.peekIndex();
    render();
    B.clock.sync().then(paintHead);
    loadIndex(false);
    setInterval(tick, 1000);
    setInterval(() => { if (!document.hidden) loadIndex(true); }, 60000);
    setInterval(() => {
      if (document.hidden || !U.rid) return;
      const r = raceOf(U.rid); if (!r || r.st === "result") return;
      N.race(U.rid, false, true).then((x) => { U.race = x; if (U.rtab !== "replay") renderRace(); }).catch(() => {});
      loadEx();
    }, 60000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.MD_UI = { render: render, openRace: openRace, openSlip: openSlip, U: U };
})();
