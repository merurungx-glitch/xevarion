/* ============================================================
   MagiMarket — mm-ui.js（画面）
   タブ：株（キオクシア）｜ジェフ千葉｜収支。シートは下から（#sheet）。確認は自前（confirm() は出ない環境がある）。
   ============================================================ */
(function () {
  "use strict";
  const MM = window.MM;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const yen = (n, d) => (n == null || !isFinite(n) ? "—" : Number(n).toLocaleString("ja-JP", { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 1 : d }));
  const xeva = (n) => Math.round(n || 0).toLocaleString("ja-JP");
  const sgn = (n) => (n > 0 ? "+" : n < 0 ? "−" : "±") + xeva(Math.abs(n));
  const cls = (n) => (n > 0 ? "up" : n < 0 ? "dn" : "");
  const UI = { tab: "stock", range: "1d", side: "buy", qty: 1, sel: null, other: "tot", jm: null, stake: 1000 };
  try { const t = sessionStorage.getItem("mm_tab"); if (t) UI.tab = t; } catch (e) {}
  if (/^#jef/.test(location.hash)) UI.tab = "jef";
  if (/^#stock/.test(location.hash)) UI.tab = "stock";

  /* ── 部品 ── */
  function toast(h, ms) {
    const box = $("#toasts"), t = document.createElement("div"); t.className = "toast"; t.innerHTML = h; box.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, ms || 2600);
  }
  function sheet(html, onClose) {
    const sh = $("#sheet"); sh.innerHTML = '<div class="sh-in">' + html + "</div>"; sh.classList.add("on");
    UI.onClose = onClose || null;
  }
  function closeSheet() { const sh = $("#sheet"); sh.classList.remove("on"); const f = UI.onClose; UI.onClose = null; if (f) f(); }
  function paintBal() { const e = $("#hdXeva"); if (e) e.textContent = xeva(window.XEVA ? XEVA.getBalance() : 0); }
  function paintClock() {
    const e = $("#hdClock");
    if (e) { const d = new Date(MM.clock.now() + 9 * 3600000), p = (n) => String(n).padStart(2, "0"); e.textContent = p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + ":" + p(d.getUTCSeconds()); }
    const s = $("#hdSync"); if (s) s.className = MM.clock.ok() ? "ok" : "";
  }

  /* ══════════ 株 ══════════ */
  async function renderStock() {
    const q = MM.peekQuote();
    const main = $("#main");
    main.innerHTML = '<section class="card px" id="pxCard"></section>' +
      '<section class="card"><div class="seg rg">' + [["1d", "1日"], ["5d", "5日"], ["1mo", "1か月"], ["6mo", "6か月"], ["1y", "1年"]].map((r) => '<button data-a="range" data-v="' + r[0] + '" class="' + (UI.range === r[0] ? "on" : "") + '">' + r[1] + "</button>").join("") + '</div><div class="chart"><canvas id="cv"></canvas></div></section>' +
      '<section class="card hold" id="holdCard"></section>' +
      '<section class="card ord" id="ordCard"></section>' +
      '<section class="card" id="pendCard"></section>' +
      '<p class="note">株価は Yahoo! Finance などの公開データ（遅れることがあります）。<b>注文は「成行」</b>で、注文したあとの最初の1分の値段（取引時間外は次の取引日の最初の値段）で約定します。1 XEVA ＝ 1円・手数料なし。投資の助言ではありません。</p>';
    paintPx(q); paintHold(q); paintOrd(q); paintPend();
    drawRange();
    const q2 = await MM.quote().catch(() => null);
    if (UI.tab !== "stock") return;
    paintPx(q2); paintHold(q2); paintOrd(q2);
    if (await MM.processOrders().catch(() => 0)) { toast("✅ 注文が約定しました"); paintHold(MM.peekQuote()); paintPend(); paintBal(); }
  }
  function paintPx(q) {
    const el = $("#pxCard"); if (!el) return;
    if (!q || !q.price) { el.innerHTML = '<div class="px-load">株価を読みこんでいます…</div>'; return; }
    const ch = q.prev ? q.price - q.prev : 0, pc = q.prev ? ch / q.prev * 100 : 0, open = MM.marketOpen();
    el.innerHTML = '<div class="px-hd"><span class="px-logo">K</span><div><b>キオクシアHD</b><small>' + MM.CODE + "・東証プライム</small></div>" +
      '<span class="px-st ' + (open ? "on" : "") + '">' + (open ? "取引中" : "取引時間外") + "</span></div>" +
      '<div class="px-main"><b>¥' + yen(q.price, 1) + '</b><span class="' + cls(ch) + '">' + (ch >= 0 ? "▲" : "▼") + " " + yen(Math.abs(ch), 1) + "（" + (pc >= 0 ? "+" : "−") + Math.abs(pc).toFixed(2) + "%）</span></div>" +
      '<div class="px-sub"><span>高値 <b>' + yen(q.hi, 0) + "</b></span><span>安値 <b>" + yen(q.lo, 0) + "</b></span><span>前日終値 <b>" + yen(q.prev, 0) + "</b></span>" +
      "<span>" + (q.time ? MM.dt(q.time * 1000) + " 時点" : "") + (q.live ? "" : q.stale ? "（控え）" : "（自動取得）") + "</span></div>" +
      '<button class="px-re" data-a="reload" aria-label="読み直す">↻</button>';
  }
  async function drawRange() {
    const cv = $("#cv"); if (!cv) return;
    MM.drawChart(cv, null, { empty: "グラフを読みこんでいます…" });
    const rk = UI.range, r = await MM.chart(rk);
    if (UI.tab !== "stock" || UI.range !== rk || !$("#cv")) return;
    const intra = rk === "1d" || rk === "5d";
    const bars = r ? r.bars : [];
    const q = MM.peekQuote();
    MM.drawChart($("#cv"), bars, { base: rk === "1d" && q ? q.prev : null, fmt: intra ? (t) => (rk === "1d" ? MM.hm(t * 1000) : MM.md(t * 1000).replace(/\(.\)/, "")) : (t) => MM.md(t * 1000).replace(/\(.\)/, ""), tipFmt: intra ? (t) => MM.dt(t * 1000) : (t) => MM.md(t * 1000), empty: "グラフを読めませんでした（通信を確かめてください）" });
  }
  function paintHold(q) {
    const el = $("#holdCard"); if (!el) return;
    const p = MM.position(), px = q && q.price;
    const val = px ? p.qty * px : 0, un = px ? val - p.cost : 0, upc = p.cost ? un / p.cost * 100 : 0;
    el.innerHTML = '<h3>保有</h3><div class="hold-g"><div><small>株数</small><b>' + xeva(p.qty) + "<i>株</i></b>" + (p.lock ? "<em>売り注文中 " + p.lock + "株</em>" : "") + "</div>" +
      "<div><small>平均取得単価</small><b>" + (p.qty ? "¥" + yen(p.avg, 1) : "—") + "</b></div>" +
      "<div><small>評価額</small><b>" + (p.qty && px ? xeva(val) : "—") + "<i>XEVA</i></b></div>" +
      '<div><small>評価損益</small><b class="' + cls(un) + '">' + (p.qty && px ? sgn(un) : "—") + "</b>" + (p.qty && px ? '<em class="' + cls(un) + '">' + (upc >= 0 ? "+" : "−") + Math.abs(upc).toFixed(2) + "%</em>" : "") + "</div></div>" +
      '<div class="hold-r"><span>確定損益（売ったぶん）</span><b class="' + cls(p.real) + '">' + sgn(p.real) + " XEVA</b></div>";
  }
  function paintOrd(q) {
    const el = $("#ordCard"); if (!el) return;
    const p = MM.position(), px = q && q.price, b = window.XEVA ? XEVA.getBalance() : 0;
    const maxBuy = px ? Math.max(0, Math.floor(b / (px * MM.RESERVE))) : 0, maxSell = p.free;
    if (UI.qty < 1) UI.qty = 1;
    const buy = UI.side === "buy", est = px ? px * UI.qty : 0, resv = Math.ceil(est * MM.RESERVE);
    const can = px && (buy ? resv <= b : UI.qty <= maxSell);
    el.innerHTML = '<div class="seg side"><button data-a="side" data-v="buy" class="b ' + (buy ? "on" : "") + '">買う</button><button data-a="side" data-v="sell" class="s ' + (!buy ? "on" : "") + '">売る</button></div>' +
      '<div class="qty"><button data-a="qty" data-v="-1" aria-label="1株へらす">−</button><label><input id="qtyIn" inputmode="numeric" value="' + UI.qty + '" aria-label="株数"><span>株</span></label><button data-a="qty" data-v="1" aria-label="1株ふやす">＋</button></div>' +
      '<div class="qq">' + [1, 10, 100].map((n) => '<button data-a="qset" data-v="' + n + '">' + n + "株</button>").join("") + '<button data-a="qset" data-v="max">最大（' + xeva(buy ? maxBuy : maxSell) + "）</button></div>" +
      '<dl class="est"><dt>見込みの' + (buy ? "代金" : "受け取り") + "</dt><dd>" + (px ? xeva(est) + " XEVA" : "—") + "</dd>" +
      (buy ? "<dt>あずかり（×" + MM.RESERVE + "・約定したら差額を返します）</dt><dd>" + (px ? xeva(resv) + " XEVA" : "—") + "</dd>" : "<dt>売れる株数</dt><dd>" + xeva(maxSell) + " 株</dd>") +
      "<dt>XEVA の残高</dt><dd>" + xeva(b) + "</dd></dl>" +
      '<button class="go ' + (buy ? "b" : "s") + (can ? "" : " off") + '" data-a="orderAsk">' + (buy ? "成行で買う" : "成行で売る") + "</button>" +
      '<p class="when">' + (MM.marketOpen() ? "いま注文すると、<b>次の1分の始値</b>で約定します（データが届いたとき）。" : "いまは取引時間外です。<b>次の取引日の最初の値段</b>で約定します（平日 9:00〜11:30・12:30〜15:30）。") + "</p>";
    const inp = $("#qtyIn");
    inp.addEventListener("change", () => { UI.qty = Math.max(1, Math.min(MM.QTY_MAX, Math.floor(Number(inp.value.replace(/[^\d]/g, "")) || 1))); paintOrd(MM.peekQuote()); });
  }
  function paintPend() {
    const el = $("#pendCard"); if (!el) return;
    const os = MM.orders(), pend = os.filter((o) => o.st === "pend"), recent = os.filter((o) => o.st !== "pend").slice(0, 6);
    if (!os.length) { el.innerHTML = '<h3>注文</h3><p class="empty">まだ注文はありません。1株から売り買いできます。</p>'; return; }
    el.innerHTML = "<h3>注文</h3>" + (pend.length ? '<div class="ol">' + pend.map((o) => '<div class="or pend"><span class="tg ' + (o.side === "buy" ? "b" : "s") + '">' + (o.side === "buy" ? "買" : "売") + "</span><div><b>" + xeva(o.qty) + "株・成行</b><small>" + MM.dt(o.at) + " 注文・約定待ち" + (o.res ? "（あずかり " + xeva(o.res) + "）" : "") + '</small></div><button class="mini" data-a="cancelAsk" data-v="' + esc(o.id) + '">取消</button></div>').join("") + "</div>" : "") +
      (recent.length ? '<div class="ol">' + recent.map((o) => '<div class="or"><span class="tg ' + (o.side === "buy" ? "b" : "s") + '">' + (o.side === "buy" ? "買" : "売") + "</span><div><b>" + (o.st === "fill" ? xeva(o.qty) + "株 × ¥" + yen(o.px, 1) : o.st === "cancel" ? xeva(o.qty) + "株・取り消し" : "約定できず（返金）") + "</b><small>" + (o.ft ? MM.dt(o.ft) + " 約定" : MM.dt(o.at)) + "</small></div><em>" + (o.st === "fill" ? (o.side === "buy" ? "−" : "+") + xeva(o.cost) : "") + "</em></div>").join("") + "</div>" : "");
  }

  /* ══════════ ジェフ千葉 ══════════ */
  async function renderJef() {
    const main = $("#main");
    let d = MM.peekJef();
    paintJef(d);
    d = await MM.jef().catch(() => null);
    if (UI.tab !== "jef") return;
    paintJef(d);
    const done = await MM.settleBets().catch(() => []);
    if (done && done.length && UI.tab === "jef") {
      const won = done.filter((b) => b.st === "won");
      paintJef(MM.peekJef()); paintBal();
      if (won.length) celebrate(won); else toast("試合の結果が出ました（" + done.length + "件）");
    }
  }
  function celebrate(won) {
    const sum = won.reduce((a, b) => a + (b.pay || 0), 0);
    sheet('<div class="win"><div class="win-b">的中！</div><p>' + won.map((b) => esc(MM.BETS[b.type].nm + "：" + MM.pickName(b.type, b.pick))).join("<br>") + "</p><b class=\"win-x\">+" + xeva(sum) + ' XEVA</b><button class="go b" data-a="close">やった！</button></div>');
    burst();
  }
  function burst() {
    const fx = $("#fx"); if (!fx) return;
    for (let i = 0; i < 46; i++) {
      const p = document.createElement("i"); p.className = "cf";
      p.style.cssText = "left:" + (Math.random() * 100) + "%;background:" + ["#ffd60a", "#00a650", "#fff", "#ffe680"][i % 4] + ";animation-delay:" + (Math.random() * 0.5) + "s;animation-duration:" + (1.6 + Math.random() * 1.4) + "s;transform:rotate(" + (Math.random() * 360) + "deg)";
      fx.appendChild(p); setTimeout(() => p.remove(), 3400);
    }
  }
  function teamTx(m) { return m.home ? "千葉 vs " + esc(m.opp) : esc(m.opp) + " vs 千葉"; }
  function paintJef(d) {
    const main = $("#main"); if (!main || UI.tab !== "jef") return;
    if (!d) { main.innerHTML = '<section class="card"><p class="empty">試合のデータを読みこんでいます…<br><small>（はじめての読みこみには通信が必要です）</small></p></section>'; return; }
    const next = MM.nextMatches(d), past = MM.pastMatches(d), rec = MM.record(d);
    const m = (UI.jm && next.find((x) => x.id === UI.jm)) || next[0];
    const tb = d.table || [], me = tb.find((r) => r.team === "千葉");
    let html = "";
    if (m) {
      const k = MM.kickAt(m), closed = MM.closed(m), oc = m.oppColor || "#556";
      const left = k - MM.clock.now();
      html += '<section class="card hero" style="--oc:' + esc(oc) + '"><div class="hero-hd"><span>' + esc(m.comp || "") + " " + esc(m.sec || "") + '</span><span class="cd" id="kickCd">' + (closed ? "締切" : cdTx(left)) + "</span></div>" +
        '<div class="hero-vs"><div class="tm jef"><i>千</i><b>千葉</b><small>' + (m.home ? "HOME" : "AWAY") + '</small></div><div class="vs"><b>VS</b><small>' + MM.md(k) + "<br>" + esc(m.time) + " キックオフ</small></div>" +
        '<div class="tm op"><i style="background:' + esc(oc) + '">' + esc((m.opp || "?").slice(0, 1)) + "</i><b>" + esc(m.opp) + "</b><small>" + (m.home ? "AWAY" : "HOME") + "</small></div></div>" +
        '<p class="hero-st">' + esc(m.stadiumFull || m.stadium || "") + (m.href ? ' ・ <a href="' + esc(m.href) + '" target="_blank" rel="noopener">試合の情報</a>' : "") + "</p>" +
        (closed ? '<p class="closed">この試合の受付は終わりました。結果は試合が終わってデータが届きしだい。</p>' : oddsRow(d, m, "res", true) +
          '<div class="seg oth">' + ["tot", "jg", "sc"].map((t) => '<button data-a="other" data-v="' + t + '" class="' + (UI.other === t ? "on" : "") + '">' + MM.BETS[t].nm + "</button>").join("") + "</div>" + oddsRow(d, m, UI.other, false)) +
        "</section>";
      const mine = MM.bets().filter((b) => b.mid === m.id);
      if (mine.length) html += '<section class="card"><h3>この試合のあなたの券</h3>' + betList(mine) + "</section>";
    } else html += '<section class="card"><p class="empty">予定されている試合がありません（データが届くのを待っています）。</p></section>';
    if (next.length > 1) html += '<section class="card"><h3>このあとの試合</h3><div class="ml">' + next.slice(0, 6).map((x) => '<button class="mr' + (m && x.id === m.id ? " on" : "") + '" data-a="pickMatch" data-v="' + esc(x.id) + '"><span>' + MM.md(MM.kickAt(x)) + "<small>" + esc(x.time) + "</small></span><b>" + teamTx(x) + "</b><em>" + esc(x.sec || "") + "</em></button>").join("") + "</div></section>";
    const open = MM.bets().filter((b) => b.st === "open" && (!m || b.mid !== m.id));
    if (open.length) html += '<section class="card"><h3>結果待ちの券</h3>' + betList(open) + "</section>";
    if (past.length) html += '<section class="card"><h3>最近の結果<small>今季 ' + rec.w + "勝 " + rec.d + "分 " + rec.l + "敗" + (me ? "・J1 " + me.rank + "位（勝点 " + me.pts + "）" : "") + "</small></h3><div class=\"ml\">" +
      past.slice(0, 6).map((x) => { const r = x.gf > x.ga ? "W" : x.gf === x.ga ? "D" : "L"; return '<div class="mr past"><span>' + MM.md(MM.kickAt(x)) + '</span><b>' + teamTx(x) + '</b><em class="sc ' + r + '">' + (x.home ? x.gf + " - " + x.ga : x.ga + " - " + x.gf) + "<i>" + ({ W: "勝", D: "分", L: "敗" })[r] + "</i></em></div>"; }).join("") + "</div></section>";
    const settled = MM.bets().filter((b) => b.st !== "open").slice(0, 8);
    if (settled.length) html += '<section class="card"><h3>終わった券</h3>' + betList(settled) + "</section>";
    if (tb.length) html += '<section class="card"><h3>J1 順位表<small>倍率の計算に使っています</small></h3>' + tableHTML(tb) + "</section>";
    html += '<p class="note">試合の日程・結果は J リーグ公式の公開ページから自動で取得しています（届くまで少しかかることがあります）。結果は<b>最終スコア</b>（延長をふくむ・PK 戦はふくまない）で決めます。倍率は順位表の得点・失点からの計算で、買ったときの倍率で確定します。締切はキックオフ（サーバーの時刻）。中止・延期は返還。</p>';
    main.innerHTML = html;
  }
  function cdTx(ms) {
    if (ms <= 0) return "締切";
    const d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), mi = Math.floor(ms % 3600000 / 60000);
    return "締切まで " + (d ? d + "日 " : "") + (d || h ? h + "時間 " : "") + mi + "分";
  }
  function oddsRow(d, m, type, big) {
    const B = MM.BETS[type];
    return '<div class="od ' + type + (big ? " big" : "") + '">' + B.picks.map((p) => { const o = MM.odds(d, m, type, p[0]); return '<button data-a="pick" data-t="' + type + '" data-v="' + esc(p[0]) + '" data-m="' + esc(m.id) + '"><span>' + esc(p[1]) + "</span><b>" + o.toFixed(1) + "<i>倍</i></b></button>"; }).join("") + "</div>" +
      (big ? "" : '<p class="od-d">' + esc(B.d) + "</p>");
  }
  function betList(arr) {
    return '<div class="bl">' + arr.map((b) => {
      const st = { open: ["結果待ち", "o"], won: ["的中", "w"], lost: ["はずれ", "l"], void: ["返還", "v"] }[b.st] || ["", ""];
      return '<div class="br ' + st[1] + '"><div><b>' + esc(MM.BETS[b.type].nm) + "：" + esc(MM.pickName(b.type, b.pick)) + "</b><small>" + esc((b.m.home ? "千葉 vs " : "") + (b.m.opp || "") + (b.m.home ? "" : " vs 千葉")) + "・" + esc(b.m.date ? MM.md(MM.kickAt(b.m)) : "") + (b.res ? "・結果 " + b.res[0] + "-" + b.res[1] : "") + "</small></div>" +
        "<span><i>" + xeva(b.stake) + " × " + b.odds.toFixed(1) + "倍</i><em>" + st[0] + (b.st === "won" ? " +" + xeva(b.pay) : b.st === "void" ? " " + xeva(b.pay) : "") + "</em></span></div>";
    }).join("") + "</div>";
  }
  function tableHTML(tb) {
    const i = tb.findIndex((r) => r.team === "千葉");
    const show = tb.filter((r, k) => k < 3 || Math.abs(k - i) <= 2);
    return '<table class="tb"><tr><th>順位</th><th>チーム</th><th>勝点</th><th>試合</th><th>得失</th></tr>' + show.map((r) => '<tr class="' + (r.team === "千葉" ? "me" : "") + '"><td>' + r.rank + "</td><td>" + esc(r.team) + "</td><td>" + r.pts + "</td><td>" + r.played + "</td><td>" + (r.gd > 0 ? "+" : "") + r.gd + "</td></tr>").join("") + "</table>";
  }
  function openSlip(type, pick, mid) {
    const d = MM.peekJef(), m = d && (d.matches || []).find((x) => x.id === mid);
    if (!m) return;
    if (MM.closed(m)) { toast("この試合の受付は終わりました"); return; }
    UI.sel = { type, pick, mid };
    paintSlip();
  }
  function paintSlip() {
    const d = MM.peekJef(), s = UI.sel, m = (d.matches || []).find((x) => x.id === s.mid), o = MM.odds(d, m, s.type, s.pick), b = window.XEVA ? XEVA.getBalance() : 0;
    UI.stake = Math.max(MM.BET_UNIT, Math.min(MM.BET_MAX, UI.stake));
    sheet('<h3 class="sh-t">' + teamTx(m) + "<small>" + MM.md(MM.kickAt(m)) + " " + esc(m.time) + "・" + esc(m.sec || "") + '</small></h3>' +
      '<div class="slip"><span>' + esc(MM.BETS[s.type].nm) + "</span><b>" + esc(MM.pickName(s.type, s.pick)) + "</b><em>" + o.toFixed(1) + "倍</em></div>" +
      '<div class="stk"><b>' + xeva(UI.stake) + '<i>XEVA</i></b><div class="stk-b">' + [100, 500, 1000, 5000].map((v) => '<button data-a="stk" data-v="' + v + '">+' + xeva(v) + "</button>").join("") + '<button data-a="stk" data-v="0">リセット</button></div></div>' +
      '<dl class="est"><dt>当たったら</dt><dd class="big">' + xeva(Math.floor(UI.stake * o)) + " XEVA</dd><dt>XEVA の残高</dt><dd>" + xeva(b) + "</dd></dl>" +
      '<button class="go b' + (UI.stake <= b ? "" : " off") + '" data-a="betGo">' + xeva(UI.stake) + " XEVA で買う</button>" +
      '<button class="ghost" data-a="close">やめる</button><p class="when">倍率は買ったときのもので確定します。締切はキックオフ（サーバーの時刻）。</p>');
  }

  /* ══════════ 収支 ══════════ */
  function renderLog() {
    const S = MM.summary(), q = MM.peekQuote(), p = S.pos, px = q && q.price;
    const un = px ? p.qty * px - p.cost : 0, betNet = S.betPay - S.betStake;
    const items = MM.orders().map((o) => ({ t: o.ft || o.at, h: '<div class="or"><span class="tg ' + (o.side === "buy" ? "b" : "s") + '">' + (o.side === "buy" ? "買" : "売") + "</span><div><b>キオクシア " + xeva(o.qty) + "株" + (o.st === "fill" ? " × ¥" + yen(o.px, 1) : "") + "</b><small>" + MM.dt(o.ft || o.at) + "・" + ({ pend: "約定待ち", fill: "約定", cancel: "取り消し", void: "約定できず" })[o.st] + "</small></div><em>" + (o.st === "fill" ? (o.side === "buy" ? "−" : "+") + xeva(o.cost) : "") + "</em></div>" }))
      .concat(MM.bets().map((b) => ({ t: b.at, h: betList([b]) })))
      .sort((a, b) => b.t - a.t).slice(0, 60);
    $("#main").innerHTML = '<section class="card sum"><h3>収支のまとめ</h3><div class="hold-g">' +
      '<div><small>株・確定損益</small><b class="' + cls(p.real) + '">' + sgn(p.real) + "</b></div>" +
      '<div><small>株・評価損益</small><b class="' + cls(un) + '">' + (p.qty && px ? sgn(un) : "—") + "</b></div>" +
      '<div><small>ジェフ戦・収支</small><b class="' + cls(betNet) + '">' + sgn(betNet) + "</b><em>" + S.betWon + "回 的中</em></div>" +
      "<div><small>結果待ちの券</small><b>" + xeva(S.betOpen) + "<i>XEVA</i></b></div></div></section>" +
      '<section class="card"><h3>これまでの記録</h3>' + (items.length ? '<div class="ol">' + items.map((x) => x.h).join("") + "</div>" : '<p class="empty">まだ記録はありません。</p>') + "</section>" +
      '<p class="note">記録は XEVARION のアカウントで、ほかの端末と同期します。</p>';
  }

  /* ══════════ タブ・操作 ══════════ */
  function go(tab) {
    UI.tab = tab; try { sessionStorage.setItem("mm_tab", tab); } catch (e) {}
    $$(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    document.body.dataset.tab = tab;
    $("#main").scrollTop = 0; window.scrollTo(0, 0);
    if (tab === "stock") renderStock(); else if (tab === "jef") renderJef(); else renderLog();
  }
  const ACT = {
    tab: (el) => go(el.dataset.tab),
    close: () => closeSheet(),
    reload: async () => { toast("読み直しています…", 1200); await MM.quote(true); renderStock(); },
    range: (el) => { UI.range = el.dataset.v; $$(".rg button").forEach((b) => b.classList.toggle("on", b === el)); drawRange(); },
    side: (el) => { UI.side = el.dataset.v; paintOrd(MM.peekQuote()); },
    qty: (el) => { UI.qty = Math.max(1, Math.min(MM.QTY_MAX, UI.qty + Number(el.dataset.v))); paintOrd(MM.peekQuote()); },
    qset: (el) => {
      const q = MM.peekQuote(), p = MM.position(), b = window.XEVA ? XEVA.getBalance() : 0;
      if (el.dataset.v === "max") UI.qty = Math.max(1, UI.side === "buy" ? (q && q.price ? Math.floor(b / (q.price * MM.RESERVE)) : 1) : p.free);
      else UI.qty = Number(el.dataset.v);
      paintOrd(q);
    },
    orderAsk: () => {
      const q = MM.peekQuote(); if (!q || !q.price) { toast("株価を読みこめていません"); return; }
      const buy = UI.side === "buy", est = q.price * UI.qty, resv = Math.ceil(est * MM.RESERVE);
      if (buy && resv > (window.XEVA ? XEVA.getBalance() : 0)) { toast("XEVA が足りません（あずかり " + xeva(resv) + "）"); return; }
      if (!buy && UI.qty > MM.position().free) { toast("売れる株が足りません"); return; }
      sheet('<h3 class="sh-t">' + (buy ? "買い" : "売り") + "の注文（成行）</h3><div class=\"slip\"><span>キオクシアHD</span><b>" + xeva(UI.qty) + "株</b><em>¥" + yen(q.price, 1) + " ×</em></div>" +
        '<dl class="est"><dt>見込みの' + (buy ? "代金" : "受け取り") + "</dt><dd>" + xeva(est) + " XEVA</dd>" + (buy ? "<dt>いま あずかる XEVA</dt><dd>" + xeva(resv) + "</dd>" : "") + "</dl>" +
        '<p class="when">' + (MM.marketOpen() ? "注文したあとの最初の1分の値段で約定します。" : "次の取引日の最初の値段で約定します。") + "値段は見込みと変わることがあります。約定する前なら取り消せます。</p>" +
        '<button class="go ' + (buy ? "b" : "s") + '" data-a="orderGo">注文する</button><button class="ghost" data-a="close">やめる</button>');
    },
    orderGo: async (el) => {
      el.classList.add("off");
      const r = await MM.order(UI.side, UI.qty);
      closeSheet();
      if (r.ok) { toast("📨 注文しました。約定を待っています"); paintBal(); renderStock(); }
      else toast({ balance: "XEVA が足りません", shares: "売れる株が足りません", price: "株価を読みこめていません", qty: "株数を入れてください", max: "一度に注文できるのは " + MM.QTY_MAX + "株までです" }[r.err] || "注文できませんでした");
    },
    cancelAsk: (el) => {
      const id = el.dataset.v;
      sheet('<h3 class="sh-t">注文を取り消しますか？</h3><p class="when">あずかった XEVA（またはおさえた株）は、すべてもどります。</p><button class="go s" data-a="cancelGo" data-v="' + esc(id) + '">取り消す</button><button class="ghost" data-a="close">もどる</button>');
    },
    cancelGo: (el) => { const ok = MM.cancel(el.dataset.v); closeSheet(); toast(ok ? "取り消しました" : "もう約定していました"); paintBal(); renderStock(); },
    pick: (el) => openSlip(el.dataset.t, el.dataset.v, el.dataset.m),
    other: (el) => { UI.other = el.dataset.v; paintJef(MM.peekJef()); },
    pickMatch: (el) => { UI.jm = el.dataset.v; paintJef(MM.peekJef()); window.scrollTo({ top: 0, behavior: "smooth" }); },
    stk: (el) => { const v = Number(el.dataset.v); UI.stake = v ? Math.min(MM.BET_MAX, UI.stake + v) : MM.BET_UNIT; paintSlip(); },
    betGo: async (el) => {
      el.classList.add("off");
      const s = UI.sel, d = MM.peekJef(), m = (d.matches || []).find((x) => x.id === s.mid);
      const r = await MM.placeBet(m, s.type, s.pick, UI.stake);
      closeSheet();
      if (r.ok) { toast("🎫 " + xeva(UI.stake) + " XEVA・" + r.odds.toFixed(1) + "倍で買いました"); paintBal(); paintJef(MM.peekJef()); }
      else toast({ balance: "XEVA が足りません", closed: "締切をすぎました", max: "1試合 " + xeva(MM.BET_MAX) + " XEVA までです", unit: "100 XEVA 単位です", clock: "時刻をたしかめられませんでした。通信を確かめてください", odds: "倍率を出せませんでした" }[r.err] || "買えませんでした", 3200);
    },
    help: () => sheet('<h3 class="sh-t">MagiMarket の使い方</h3><ul class="hl">' +
      "<li><b>株（キオクシア）</b>：1 XEVA ＝ 1円で、キオクシアの株を1株から売り買いできます。手数料はありません。</li>" +
      "<li>注文は<b>成行</b>です。注文したあとの最初の1分の値段（取引時間外なら次の取引日の最初の値段）で約定します。表示の株価は少し遅れることがあるため、だれも先回りできないようにしています。</li>" +
      "<li>買いの注文は、見込みの代金の1.15倍をあずかり、約定したら差額をもどします。約定する前なら取り消せます。</li>" +
      "<li><b>ジェフ千葉</b>：次の試合の勝敗・合計ゴール・千葉の得点・スコアに XEVA で賭けられます（100 XEVA から・1試合 10万まで）。倍率は買ったときのもので確定。締切はキックオフ。</li>" +
      "<li>結果は J リーグ公式の最終スコア（延長をふくむ・PK 戦はふくまない）。中止・延期は返還します。</li>" +
      "<li>記録はアカウントで同期します。投資やスポーツくじの助言ではありません（XEVA はアプリの中だけの通貨です）。</li></ul>" +
      '<button class="go b" data-a="close">とじる</button>'),
  };
  document.addEventListener("click", (e) => {
    const el = e.target.closest ? e.target.closest("[data-a],[data-tab]") : null;
    if (el) { const f = ACT[el.dataset.a || (el.dataset.tab ? "tab" : "")]; if (f && !el.classList.contains("off")) { e.preventDefault(); f(el); } return; }
    if (e.target === $("#sheet")) closeSheet();
  });
  window.addEventListener("xeva:change", paintBal);
  window.addEventListener("storage", (e) => { if (e.key === "magimarket_v1") { if (UI.tab === "stock") { paintHold(MM.peekQuote()); paintPend(); } else if (UI.tab === "jef") paintJef(MM.peekJef()); else renderLog(); } });
  window.addEventListener("xeva:synced", () => { paintBal(); });

  /* ── 1秒ごと：時計・締切まで ／ 1分ごと：株価・約定・精算 ── */
  setInterval(() => {
    paintClock();
    if (UI.tab === "jef") {
      const cd = $("#kickCd"), d = MM.peekJef();
      if (cd && d) { const m = (UI.jm && MM.nextMatches(d).find((x) => x.id === UI.jm)) || MM.nextMatches(d)[0]; if (m) cd.textContent = MM.closed(m) ? "締切" : cdTx(MM.kickAt(m) - MM.clock.now()); }
    }
  }, 1000);
  setInterval(async () => {
    if (document.hidden) return;
    if (UI.tab === "stock") { const q = await MM.quote(true).catch(() => null); paintPx(q); paintHold(q); if (!$("#sheet").classList.contains("on")) paintOrd(q); if (await MM.processOrders().catch(() => 0)) { toast("✅ 注文が約定しました"); paintHold(MM.peekQuote()); paintPend(); paintBal(); } }
    else if (UI.tab === "jef") { const done = await MM.settleBets().catch(() => []); if (done.length) { paintJef(await MM.jef()); paintBal(); const w = done.filter((b) => b.st === "won"); if (w.length) celebrate(w); } }
  }, 60000);

  window.addEventListener("online", () => { const b = $("#offBar"); if (b) b.hidden = true; });
  window.addEventListener("offline", () => { const b = $("#offBar"); if (b) b.hidden = false; });

  MM.boot = function () {
    if (navigator.onLine === false) { const b = $("#offBar"); if (b) b.hidden = false; }
    MM.clock.sync();
    paintBal(); paintClock();
    go(UI.tab);
    /* もう一方のタブの約定・精算も裏で（開いていなくても） */
    setTimeout(() => { MM.processOrders().then((n) => { if (n) { toast("✅ 注文が約定しました"); paintBal(); } }).catch(() => {}); MM.settleBets().then((d) => { if (d.length) { paintBal(); if (UI.tab === "jef") paintJef(MM.peekJef()); } }).catch(() => {}); }, 2500);
  };
  MM.UI = { go, toast, sheet, closeSheet, peek: () => UI };
})();
