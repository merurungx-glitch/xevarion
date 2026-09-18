/* ══════════════════════════════════════════════════════════════
   rail-ui.js — MagiRail の画面
   ──────────────────────────────────────────────────────────────
   ★ 計算は rail-core.js（window.RAIL）。ここは見せかたと入力だけ。
   ★ ボタンは data-a="動作" data-v="値" を1か所（ACT）で受ける。
   ★ 「正解」を教えない：どの画面も<b>数字</b>（需要・輸送力・乗車率・積み残し・待ち時間・利益）と
     <b>起きたこと</b>だけを出し、「◯本にしてください」のような指示は書かない。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const RL = window.RAIL, RC = window.RChart;
  const $ = (s, r) => (r || document).querySelector(s);
  const B = RL.BANDS, V = RL.VEHICLES;
  const N = RL.fmtN, Y = RL.fmtYen;
  /* 1万以上は「◯万」（スマホの狭いカードで数字が切れないように） */
  const NK = (v) => (Math.abs(v) >= 1e4 ? (v / 1e4).toFixed(Math.abs(v) >= 1e5 ? 0 : 1) + "万" : N(v));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const C_DEM = "#eb6834", C_CAP = "#2a78d6", C_LEFT = "#e34948", C_OK = "#1baf7a", C_LOAD = "#4a3aa7";
  /* 1倍速で1秒に進むゲーム内の分（★ 2026-09-18 6→2.5。1×で約8分／8×で約1分で1日） */
  const MPS = 2.5;
  const clockOf = (R) => (R.clock != null ? R.clock : R.t);

  let G = null, tab = "run", sub = null, bandSel = 2, running = false, lastTs = 0, lastUi = 0, holdUi = 0, graphSel = "dc";

  /* ══════════ 共通 ══════════ */
  function show(id) { document.querySelectorAll(".scr").forEach((s) => s.classList.toggle("on", s.id === id)); }
  function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { el.hidden = true; }, 2200); }
  function open(html) { $("#sheet").innerHTML = '<button class="x" data-a="close" aria-label="閉じる">✕</button>' + html; $("#ov").classList.add("on"); $("#sheet").scrollTop = 0; }
  function close() { $("#ov").classList.remove("on"); }
  const pct = (v) => Math.round(v * 100) + "%";
  const min1 = (v) => (Math.round(v * 10) / 10).toFixed(1) + "分";
  function crowdTag(r) { const c = RL.crowdOf(r); return '<span class="cw cw' + c.lv + '">' + c.ic + " " + c.nm + "</span>"; }
  function kv(k, v, cls, sub2) { return '<div class="kv ' + (cls || "") + '"><small>' + k + "</small><b>" + v + "</b>" + (sub2 ? "<em>" + sub2 + "</em>" : "") + "</div>"; }
  function stars(sat) { const n = clamp(Math.round(sat / 20), 0, 5); return "★".repeat(n) + "☆".repeat(5 - n); }
  function lineDot(li) { return '<i class="ld" style="background:' + G.lines[li].col + '"></i>'; }
  function curBand() { return G.run ? RL.bandOf(Math.min(clockOf(G.run), RL.DAY_END - 1)) : bandSel; }

  /* いまの日（走らせ中）か、きのうのレポートの値 */
  function lineBandNow(li, bi) {
    const R = G.run;
    const pv = RL.preview(G)[li][bi];
    if (R) {
      const S = R.S[li][bi];
      return { dem: pv.dem, cap: pv.cap, board: S.board, left: S.left, wait: S.board ? S.waitArea / S.board : 0, load: S.loadN ? S.loadMax / S.loadN : pv.dem / Math.max(1, pv.cap),
               eff: S.ckm ? S.pkm / S.ckm : 0, rev: S.rev, cost: S.cost, cancel: S.cancel, delay: S.delayMax, live: true, trains: S.trains };
    }
    const rp = G.report && G.report.lines[li] ? G.report.lines[li].bands[bi] : null;
    return { dem: pv.dem, cap: pv.cap, board: rp ? rp.board : 0, left: rp ? rp.left : 0, wait: rp ? rp.wait : 0, load: rp && rp.load ? rp.load : pv.dem / Math.max(1, pv.cap),
             eff: rp ? rp.eff : 0, rev: rp ? rp.rev : 0, cost: rp ? rp.cost : 0, cancel: rp ? rp.cancel : 0, delay: rp ? rp.delayMax : 0, live: false, trains: rp ? rp.trains : 0, est: !rp };
  }

  /* ══════════ タイトル・選択 ══════════ */
  function renderTitle() { $("#btnCont").hidden = !RL.load(); show("title"); }
  function renderSelect() {
    const has = RL.load();
    $("#selList").innerHTML = RL.SCENARIOS.map((sc) => {
      const c = RL.CITIES[sc.city];
      return '<div class="city">'
        + '<div class="ch"><div><div class="cn">' + sc.nm + '</div><div class="cs">' + c.nm + " ・ " + c.ja + '</div></div><div class="stars" aria-label="難易度">' + "★".repeat(c.stars) + "☆".repeat(5 - c.stars) + "</div></div>"
        + '<div class="cg">' + kv("人口", N(c.pop) + "人") + kv("駅", c.stations + "駅") + kv("路線", c.lines + "路線") + kv("資金", Y(c.cash)) + "</div>"
        + '<div class="cd">' + c.d + "</div>"
        + '<div class="goals"><b>勝利条件</b>' + sc.goals.map((g) => "<div>◇ " + goalTx(g) + "</div>").join("") + "</div>"
        + '<button class="btn pri" data-a="pick" data-v="' + sc.id + '">この都市ではじめる</button></div>';
    }).join("") + (has ? '<p class="note">※ はじめると、いまのセーブ（' + RL.SCENARIOS.find((s) => s.id === has.scenario).nm + " ・ Day " + has.day + "）は上書きされます。</p>" : "");
    show("select");
  }
  function goalTx(g) {
    if (g.k === "pop") return "人口 " + N(g.v) + " 人" + (g.keep ? " を維持" : " を達成");
    if (g.k === "sat") return "乗客満足度 " + g.v + " 以上";
    if (g.k === "profitStreak") return g.v + " 日連続で黒字";
    if (g.k === "rushLeft") return "朝ラッシュの積み残し率 " + Math.round(g.v * 100) + "% 以下を " + g.days + " 日連続";
    if (g.k === "cumProfit") return g.within + " 日以内に累計利益 " + Y(g.v);
    return "";
  }
  function startGame(G0) {
    mv = { x: 0, y: 0, w: 1000, h: 700 }; mapFull = false;
    G = G0; tab = "run"; sub = null; bandSel = 2; running = false;
    show("game"); paintNav(); renderAll();
  }

  /* ══════════ 上の数字・時計 ══════════ */
  function renderHud() {
    if (!G) return;
    const R = G.run, last = G.hist[G.hist.length - 1];
    let prof, riders, lbl;
    if (R) {
      const frac = clamp((clockOf(R) - RL.DAY_START) / (RL.DAY_END - RL.DAY_START), 0, 1);
      const fixed = (last ? last.cost - (G.report ? G.report.cost.op : 0) : 0) * frac;
      prof = R.rev - R.opCost - fixed; riders = R.hourRiders.reduce((a, b) => a + b, 0); lbl = "本日の利益（途中）";
    } else { prof = last ? last.profit : 0; riders = last ? last.riders : 0; lbl = last ? "きのうの利益" : "本日の利益"; }
    const sat = last ? last.sat : G.satAll;
    $("#kpis").innerHTML = kv("人口", NK(G.city.pop) + '<small>人</small>')
      + kv(lbl, (prof >= 0 ? "+" : "") + Y(prof), prof >= 0 ? "pos" : "neg")
      + kv(R ? "本日の乗客" : "きのうの乗客", NK(riders) + "<small>人</small>")
      + kv("鉄道評価", '<span class="st">' + stars(sat) + "</span>", "", sat + " / 100");
    $("#tDay").textContent = "Day " + G.day;
    const t = R ? clockOf(R) : RL.DAY_START;
    $("#tClock").textContent = R ? RL.clock(Math.min(t, RL.DAY_END)) : "計画中";
    $("#tBand").textContent = R ? B[RL.bandOf(Math.min(t, RL.DAY_END - 1))].nm : "運行前";
    const sp = G.speed || 1;
    $("#spd").innerHTML = '<button class="play' + (running ? " on" : "") + '" data-a="play">' + (running ? "❚❚" : "▶") + "</button>"
      + [1, 2, 4, 8].map((x) => '<button class="' + (sp === x ? "on" : "") + '" data-a="speed" data-v="' + x + '">' + x + "×</button>").join("")
      + '<button data-a="skip" title="この日の終わりまで進める">⏭</button>';
  }
  function paintNav() { document.querySelectorAll("#bnav button").forEach((b) => b.classList.toggle("on", b.dataset.v === tab)); }

  /* ══════════ 画面の振り分け ══════════ */
  function renderAll() { renderHud(); renderView(); }
  function renderView() {
    if (!G) return;
    const el = $("#view"), y = el.scrollTop;
    let h = "";
    if (sub && sub.k === "line") h = viewLine(sub.li);
    else if (sub && sub.k === "plan") h = viewPlan();
    else if (sub && sub.k === "st") h = viewStation(sub.id);
    else if (tab === "run") h = viewRun();
    else if (tab === "veh") h = viewVeh();
    else if (tab === "st") h = viewStations();
    else if (tab === "city") h = viewCity();
    else if (tab === "biz") h = viewBiz();
    el.innerHTML = h;
    el.scrollTop = y;
    drawCharts();
    if (tab === "run" && !sub) drawTrains();
  }
  const charts = [];
  function chartBox(id, title, series, cfg) {
    charts.push({ id, series, cfg });
    return '<div class="card chart"><div class="ct">' + title + "</div>" + (series.length > 1 ? RC.legend(series) : "") + '<canvas id="' + id + '"></canvas>'
      + (cfg.note ? '<div class="note">' + cfg.note + "</div>" : "") + "</div>";
  }
  function drawCharts() {
    charts.splice(0).forEach((c) => { const cv = document.getElementById(c.id); if (cv) RC.draw(cv, Object.assign({ series: c.series }, c.cfg)); });
  }
  const BL = B.map((b) => b.s + "時");

  /* ══════════ 運行（路線図＋路線の一覧）══════════ */
  function bandChips(active) {
    return '<div class="chips">' + B.map((b, i) => '<button class="' + (i === active ? "on" : "") + '" data-a="band" data-v="' + i + '">' + b.nm + "<small>" + b.s + "-" + b.e + "</small></button>").join("") + "</div>";
  }
  function eventBanner() {
    const ev = RL.eventsToday(G), up = G.events.filter((e) => e.ann && e.day > G.day);
    if (!ev.length && !up.length) return "";
    return '<div class="card ev">' + ev.map((e) => '<div class="evr now"><b>本日</b>' + RL.eventText(G, e) + "</div>").join("")
      + up.map((e) => '<div class="evr"><b>' + (e.day - G.day) + "日後</b>" + RL.eventText(G, e) + "</div>").join("") + "</div>";
  }
  function viewRun() {
    const bi = G.run ? curBand() : bandSel;
    let h = eventBanner();
    if (!G.run) h += '<div class="card hint">▶ を押すと <b>Day ' + G.day + "</b> の運行がはじまります。運行前でも、路線をタップして本数・両数・車両を調整できます。</div>";
    h += '<div class="card map' + (mapFull ? " full" : "") + '"><div class="mwrap">' + mapSVG()
      + '<div class="mctl"><button data-a="mz" data-v="in" aria-label="拡大">＋</button><button data-a="mz" data-v="out" aria-label="縮小">−</button>'
      + '<button data-a="mz" data-v="reset" aria-label="全体">⟲</button><button data-a="mfull" aria-label="大きく表示">' + (mapFull ? "⤡" : "⤢") + "</button></div></div>"
      + '<div class="mlg">🟢 余裕 ／ 🟡 混雑 ／ 🔴 満員 ・ 駅の円＝待っている人 ・ 2本指／ホイールで拡大、ドラッグで移動</div></div>';
    h += '<div class="sec"><b>路線</b><span>' + (G.run ? "いま：" + B[bi].nm : "表示する時間帯") + "</span></div>";
    if (!G.run) h += bandChips(bi);
    h += G.lines.map((L, li) => {
      const x = lineBandNow(li, bi);
      const P = G.plan[li][bi];
      const over = x.dem > x.cap;
      return '<button class="card lcard" data-a="line" data-v="' + li + '" style="--lc:' + L.col + '">'
        + '<div class="lh">' + lineDot(li) + "<b>" + L.nm + "</b><span>" + P.f + "本/h ・ " + Math.min(P.c, RL.lineMaxCars(G, li)) + "両 ・ " + V[P.v].nm.replace("Magi ", "") + "</span></div>"
        + '<div class="lg4">' + kv("需要", NK(x.dem) + "<small>人/h</small>") + kv("輸送力", NK(x.cap) + "<small>人/h</small>", over ? "warn" : "")
        + kv(x.live || !x.est ? "乗車率" : "需要÷輸送力", pct(x.live || !x.est ? x.load : x.dem / Math.max(1, x.cap))) + kv("積み残し", x.est ? "—" : NK(x.left) + "<small>人</small>", x.left > 50 ? "warn" : "") + "</div>"
        + (over ? '<div class="flag">▲ この時間帯は需要が輸送力を上回っています</div>' : "") + "</button>";
    }).join("");
    h += '<div class="brow"><button class="btn" data-a="plan">運行計画表（全路線）</button></div>';
    return h;
  }
  function mapSVG() {
    const S = G.stations;
    let h = '<svg viewBox="' + mv.x + " " + mv.y + " " + mv.w + " " + mv.h + '" class="msvg" id="msvg" role="img" aria-label="路線図" style="--z:' + zk() + '">';
    G.lines.forEach((L, li) => {
      const pts = L.st.map((sid) => S[sid].x + "," + S[sid].y).join(" ");
      h += '<polyline points="' + pts + '" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>';
      h += '<polyline points="' + pts + '" fill="none" stroke="' + L.col + '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
      h += '<polyline points="' + pts + '" fill="none" stroke="transparent" stroke-width="36" data-a="line" data-v="' + li + '" style="cursor:pointer"/>';
      const a = S[L.st[0]];
      h += '<text x="' + a.x + '" y="' + (a.y - 22) + '" class="lnm" fill="' + L.col + '">' + L.nm.replace(" Line", "") + "</text>";
    });
    h += '<g id="waits">' + waitsSVG() + "</g>";
    /* ★ 駅が多い街（30駅超）は、乗換駅と終点だけ名前を出す（重なって読めなくなるため。ほかの駅はタップで詳細） */
    const ends = {}; G.lines.forEach((L) => { ends[L.st[0]] = 1; ends[L.st[L.st.length - 1]] = 1; });
    const many = S.length > 30;
    S.forEach((s) => {
      const nm = !many || s.lines.length > 1 || ends[s.id];
      h += '<g data-a="st" data-v="' + s.id + '" style="cursor:pointer"><circle cx="' + s.x + '" cy="' + s.y + '" r="' + (s.lines.length > 1 ? 13 : 9) + '" fill="#fff" stroke="#1b2a44" stroke-width="' + (s.lines.length > 1 ? 4 : 3) + '"/>'
        + (nm ? '<text x="' + (s.x + 14) + '" y="' + (s.y + 26) + '" class="snm">' + s.nm + "</text>" : "") + "</g>";
    });
    h += '<g id="trains"></g></svg>';
    return h;
  }
  function waitsSVG() {
    if (!G.run) return "";
    return G.stations.map((s) => { const q = RL.waitingAt(G, s.id); if (q < 20) return ""; const r = clamp(Math.sqrt(q) * 0.9, 10, 60);
      return '<circle cx="' + s.x + '" cy="' + s.y + '" r="' + r.toFixed(1) + '" fill="rgba(235,104,52,.22)" stroke="rgba(235,104,52,.6)" stroke-width="2"/>'; }).join("");
  }
  /* ══ ★★ 2026-09-18 路線図の拡大・移動（ご指定「見づらいので拡大や移動を」）══
     viewBox を直接書きかえる（描き直さない）。ドラッグ＝移動／2本指・ホイール・＋−＝拡大縮小。
     ★ 指を動かしているあいだは画面の描き直しを止める（pressing）。描き直すと SVG が入れかわって手が離れる。
     ★ 動かしたあとの「クリック」は捨てる（駅や路線の詳細が開いてしまわないように）。 */
  let mv = { x: 0, y: 0, w: 1000, h: 700 }, mapFull = false, pressing = false, dragMoved = false;
  const zk = () => Math.max(0.3, mv.w / 1000).toFixed(3);
  function mvClamp() {
    mv.w = clamp(mv.w, 140, 1000); mv.h = mv.w * 0.7;
    mv.x = clamp(mv.x, -mv.w * 0.3, 1000 - mv.w * 0.7); mv.y = clamp(mv.y, -mv.h * 0.3, 700 - mv.h * 0.7);
    if (mv.w >= 1000) { mv.x = 0; mv.y = 0; }
  }
  function mvApply() {
    mvClamp();
    const el = document.getElementById("msvg");
    if (el) { el.setAttribute("viewBox", mv.x + " " + mv.y + " " + mv.w + " " + mv.h); el.style.setProperty("--z", zk()); }
  }
  function mvZoom(k, cx, cy) {
    /* cx,cy … 拡大の中心（viewBox の座標）。無ければ今の中心 */
    if (cx == null) { cx = mv.x + mv.w / 2; cy = mv.y + mv.h / 2; }
    const nw = clamp(mv.w / k, 140, 1000), r = nw / mv.w;
    mv.x = cx - (cx - mv.x) * r; mv.y = cy - (cy - mv.y) * r; mv.w = nw;
    mvApply();
  }
  /* 画面の点 → viewBox の座標（余白つきの表示でもずれないよう、SVG の変換行列で換算） */
  function toVB(el, px, py) {
    try { const pt = el.createSVGPoint(); pt.x = px; pt.y = py; const q = pt.matrixTransform(el.getScreenCTM().inverse()); return { x: q.x, y: q.y }; }
    catch (e) { const r = el.getBoundingClientRect(); return { x: mv.x + (px - r.left) / r.width * mv.w, y: mv.y + (py - r.top) / r.height * mv.h }; }
  }
  function pxScale(el) { try { return el.getScreenCTM().a || 1; } catch (e) { return el.getBoundingClientRect().width / mv.w; } }
  const ptrs = new Map();
  let pinch0 = null;
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest && e.target.closest("#msvg"); if (!el) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pressing = true; dragMoved = false;
    if (ptrs.size === 2) { const a = [...ptrs.values()]; pinch0 = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), w: mv.w }; }
  });
  document.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return;
    const el = document.getElementById("msvg"); if (!el) return;
    const prev = ptrs.get(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = el.getBoundingClientRect();
    if (ptrs.size >= 2 && pinch0) {
      const a = [...ptrs.values()];
      const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      const c = toVB(el, (a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2);
      const k = (pinch0.w / mv.w) * (d / Math.max(1, pinch0.d));
      mvZoom(k, c.x, c.y);
      dragMoved = true;
      return;
    }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 0) {
      if (Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y) > 1) dragMoved = true;
      const sc = pxScale(el); mv.x -= dx / sc; mv.y -= dy / sc; mvApply();
    }
  });
  const ptrEnd = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null; if (!ptrs.size) { pressing = false; holdUi = performance.now() + 500; } };
  document.addEventListener("pointerup", ptrEnd); document.addEventListener("pointercancel", ptrEnd);
  document.addEventListener("wheel", (e) => {
    const el = e.target.closest && e.target.closest("#msvg"); if (!el) return;
    e.preventDefault();
    const c = toVB(el, e.clientX, e.clientY);
    mvZoom(e.deltaY < 0 ? 1.18 : 1 / 1.18, c.x, c.y);
  }, { passive: false });
  document.addEventListener("click", (e) => { if (dragMoved && e.target.closest && e.target.closest("#msvg")) { e.stopPropagation(); e.preventDefault(); dragMoved = false; } }, true);
  function drawTrains() {
    const g = document.getElementById("trains"); if (!g || !G.run) { if (g) g.innerHTML = ""; return; }
    const R = G.run;
    g.innerHTML = R.trains.map((T) => {
      const p = RL.trainPos(G, T, clockOf(R));
      const col = p.load >= 1.2 ? "#e34948" : p.load >= 0.8 ? "#eda100" : "#1baf7a";
      return '<rect x="' + (p.x - 15) + '" y="' + (p.y - 10) + '" width="30" height="20" rx="6" fill="' + col + '" stroke="#fff" stroke-width="3.5"/>';
    }).join("");
    const w = document.getElementById("waits"); if (w) w.innerHTML = waitsSVG();
  }

  /* ══════════ 路線の詳細 ══════════ */
  function viewLine(li) {
    const L = G.lines[li], bi = G.run ? (sub.bi != null ? sub.bi : curBand()) : bandSel;
    const x = lineBandNow(li, bi);
    const maxC = RL.lineMaxCars(G, li);
    const km = L.km.reduce((a, b) => a + b, 0);
    let h = '<div class="back"><button class="ib" data-a="back">←</button><div class="ttl" style="--lc:' + L.col + '">' + lineDot(li) + L.nm + "</div></div>";
    h += '<div class="note">' + L.st.length + "駅 ・ " + km.toFixed(1) + "km ・ " + L.st.map((sid) => G.stations[sid].nm).join(" → ") + "</div>";
    h += bandChips(bi);
    h += '<div class="card"><div class="ct">' + B[bi].nm + "（" + B[bi].lbl + "）" + (x.live ? " ・ 本日" : x.est ? " ・ 見込み" : " ・ きのう") + "</div>"
      + '<div class="kgrid">' + kv("需要", N(x.dem), "big", "人/h（いちばん混む区間）") + kv("輸送力", N(x.cap), "big" + (x.dem > x.cap ? " warn" : ""), "人/h（定員ベース）")
      + kv("乗車率", x.est ? pct(x.dem / Math.max(1, x.cap)) : pct(x.load), "", x.est ? "需要÷輸送力" : crowdTag(x.load)) + kv("積み残し", x.est ? "—" : N(x.left), x.left > 50 ? "warn" : "", "人（延べ）")
      + kv("平均待ち時間", x.est ? "—" : min1(x.wait)) + kv("平均乗車率", x.est ? "—" : pct(x.eff), "", "全区間の平均")
      + (x.cancel ? kv("運休", x.cancel + "本", "warn", "車両不足") : "") + (x.delay >= 1 ? kv("最大遅延", "+" + min1(x.delay), x.delay >= 3 ? "warn" : "") : "") + "</div></div>";
    /* 運行計画（時間帯×本数・両数・車両） */
    h += '<div class="sec"><b>運行計画</b><span>ホームの長さで最大 ' + maxC + " 両</span></div>";
    h += '<div class="card plan"><div class="pr ph"><span>時間帯</span><span>本数/h</span><span>両数</span><span>車両</span></div>'
      + B.map((b, i) => {
        const P = G.plan[li][i];
        return '<div class="pr' + (i === bi ? " on" : "") + '"><span data-a="band" data-v="' + i + '"><b>' + b.nm + "</b><small>" + b.lbl + "</small></span>"
          + '<span class="stp"><button data-a="pf" data-v="' + li + ":" + i + ':-1">−</button><b>' + P.f + '</b><button data-a="pf" data-v="' + li + ":" + i + ':1">＋</button></span>'
          + '<span class="stp"><button data-a="pc" data-v="' + li + ":" + i + ':-1">−</button><b>' + Math.min(P.c, maxC) + (P.c > maxC ? "*" : "") + '</b><button data-a="pc" data-v="' + li + ":" + i + ':1">＋</button></span>'
          + '<span><button class="vb v-' + P.v + '" data-a="pv" data-v="' + li + ":" + i + '">' + V[P.v].nm.replace("Magi ", "") + "</button></span></div>";
      }).join("") + "</div>";
    h += '<div class="brow"><button class="btn sm" data-a="copyband" data-v="' + li + ":" + bi + '">「' + B[bi].nm + "」の設定を全時間帯へ</button></div>";
    /* 収支（この路線・1日） */
    let rev = 0, cost = 0; for (let i = 0; i < B.length; i++) { const y = lineBandNow(li, i); rev += y.rev; cost += y.cost; }
    h += '<div class="card"><div class="ct">この路線の収支（' + (G.run ? "本日ここまで" : G.report ? "きのう" : "—") + "）</div>"
      + '<div class="kgrid">' + kv("運行費", Y(cost)) + kv("運賃収入", Y(rev)) + kv("利益", (rev - cost >= 0 ? "+" : "") + Y(rev - cost), rev - cost >= 0 ? "pos" : "neg", "駅・車両の維持費は別") + "</div></div>";
    const pv = RL.preview(G)[li];
    h += chartBox("cLineDC", "需要と輸送力（時間帯別）", [
      { nm: "需要", c: C_DEM, data: pv.map((p) => Math.round(p.dem)) },
      { nm: "輸送力", c: C_CAP, data: pv.map((p) => Math.round(p.cap)) },
    ], { labels: BL, sub: B.map((b) => b.nm), yfmt: RC.kfmt, tfmt: (v) => N(v) + " 人/h", note: "需要がいちばん混む区間を通る人/h、輸送力は本数×両数×定員。" });
    if (G.report || G.run) {
      const bs = B.map((b, i) => lineBandNow(li, i));
      h += chartBox("cLineLF", "時間帯別の乗車率（ピーク区間の平均）", [{ nm: "乗車率", c: C_LOAD, data: bs.map((z) => Math.round(z.load * 100)) }],
        { labels: BL, sub: B.map((b) => b.nm), yfmt: (v) => Math.round(v) + "%", max: 100 });
      h += chartBox("cLineLeft", "時間帯別の積み残し（延べ人数）", [{ nm: "積み残し", c: C_LEFT, type: "bar", data: bs.map((z) => Math.round(z.left)) }],
        { labels: BL, sub: B.map((b) => b.nm), tfmt: (v) => N(v) + " 人" });
    }
    return h;
  }
  /* 全路線の運行計画表 */
  function viewPlan() {
    let h = '<div class="back"><button class="ib" data-a="back">←</button><div class="ttl">運行計画表</div></div>';
    h += '<div class="card"><div class="ptab" style="grid-template-columns:86px repeat(' + G.lines.length + ',minmax(64px,1fr))"><span class="hd">時間帯</span>'
      + G.lines.map((L, li) => '<span class="hd">' + lineDot(li) + L.nm.replace(" Line", "") + "</span>").join("")
      + B.map((b, i) => '<span class="bd"><b>' + b.nm + "</b><small>" + b.lbl + "</small></span>" + G.lines.map((L, li) => {
          const P = G.plan[li][i];
          return '<button class="cell" data-a="cell" data-v="' + li + ":" + i + '">' + P.f + "本<small>" + Math.min(P.c, RL.lineMaxCars(G, li)) + "両・" + V[P.v].nm.replace("Magi ", "").slice(0, 3) + "</small></button>";
        }).join("")).join("") + "</div></div>";
    const need = RL.fleetNeed(G);
    const own = RL.totalCars(G);
    h += chartBox("cNeed", "時間帯ごとに必要な車両（計画から）", [
      { nm: "必要な両数", c: C_CAP, type: "bar", data: need.map((o) => o.commuter + o.rapid + o.premium) },
      { nm: "保有両数", c: C_DEM, data: B.map(() => own) },
    ], { labels: BL, sub: B.map((b) => b.nm), tfmt: (v) => N(v) + " 両", note: "必要な両数＝本数×1往復の時間×両数（上り・下り）。保有を超える時間帯は、車両が戻ってくるまで一部の列車が運休します。" });
    return h;
  }

  /* ══════════ 車両 ══════════ */
  function viewVeh() {
    const R = G.run, own = RL.totalCars(G);
    let h = '<div class="card"><div class="ct">車両基地</div><div class="kgrid">' + kv("収容能力", N(G.depot) + "両") + kv("保有", N(own) + "両") + kv("余裕", N(G.depot - own) + "両", G.depot - own < 4 ? "warn" : "") + "</div>"
      + '<div class="bar"><i style="width:' + Math.round(own / G.depot * 100) + '%"></i></div>'
      + '<button class="btn sm" data-a="depot">基地を拡張（+' + RL.DEPOT_STEP + "両・" + Y(RL.depotCost(G)) + "）</button></div>";
    h += RL.VKEYS.map((vk) => {
      const x = V[vk], use = R ? R.inUse[vk] : 0;
      return '<div class="card veh v-' + vk + '"><div class="vh"><span class="vic">🚃</span><div><b>' + x.nm + "</b><small>" + x.ja + "</small></div><div class=\"vn\">" + N(G.fleet[vk] || 0) + "<small>両</small></div></div>"
        + '<div class="note">' + x.d + "</div>"
        + '<div class="kgrid s">' + kv("定員", x.cap + "人/両") + kv("最大の押しこみ", Math.round(x.crush * 100) + "%") + kv("最高速度", x.speed + "km/h") + kv("加速", x.accel)
        + kv("快適性", x.comfort) + kv("購入価格", Y(x.price) + "/両") + kv("維持費", Y(x.maint) + "/両・日") + kv("電力・摩耗", "¥" + x.carKm + "/両km") + (R ? kv("いま運行中", use + "両") : "") + "</div>"
        + '<div class="brow"><button class="btn sm pri" data-a="buy" data-v="' + vk + ':2">2両 購入（' + Y(x.price * 2) + '）</button><button class="btn sm pri" data-a="buy" data-v="' + vk + ':10">10両 購入</button>'
        + '<button class="btn sm gh" data-a="sell" data-v="' + vk + ':2">2両 売却</button></div></div>';
    }).join("");
    const need = RL.fleetNeed(G);
    h += chartBox("cVeh", "車両稼働（時間帯別）", [
      { nm: "計画で必要な両数", c: C_CAP, type: "bar", data: need.map((o) => o.commuter + o.rapid + o.premium) },
      { nm: "きのう実際に使った両数", c: C_OK, type: "bar", data: G.report ? G.report.useBand : B.map(() => 0) },
      { nm: "保有", c: C_DEM, data: B.map(() => own) },
    ], { labels: BL, sub: B.map((b) => b.nm), tfmt: (v) => N(v) + " 両", note: "同じ車両を時間帯によって別の路線へ回せます（本数を減らした時間帯の車両は、ほかの路線で使えます）。" });
    return h;
  }

  /* ══════════ 駅 ══════════ */
  function stDay(sid) {
    const R = G.run;
    if (R) { let b = 0, l = 0, w = 0; R.stS[sid].forEach((x) => { b += x.board; l += x.left; w += x.waitArea; }); return { board: b, left: l, wait: b ? w / b : 0 }; }
    if (G.report) { let b = 0, l = 0, w = 0; G.report.stations[sid].forEach((x) => { b += x.board; l += x.left; w += x.wait * x.board; }); return { board: b, left: l, wait: b ? w / b : 0 }; }
    return { board: 0, left: 0, wait: 0 };
  }
  function viewStations() {
    const list = G.stations.map((s) => ({ s, q: RL.waitingAt(G, s.id), d: stDay(s.id) }));
    list.sort((a, b) => (G.run ? b.q - a.q : b.d.board - a.d.board));
    return '<div class="sec"><b>駅</b><span>' + (G.run ? "待っている人が多い順" : "きのうの乗車が多い順") + "</span></div>"
      + list.map((x) => '<button class="card srow" data-a="st" data-v="' + x.s.id + '"><div class="sn">' + x.s.lines.map(lineDot).join("") + "<b>" + x.s.nm + "</b></div>"
        + '<div class="lg4">' + kv("待機", G.run ? NK(x.q) : "—") + kv(G.run ? "本日の乗車" : "きのうの乗車", NK(x.d.board)) + kv("積み残し", NK(x.d.left), x.d.left > 50 ? "warn" : "") + kv("平均待ち", x.d.board ? min1(x.d.wait) : "—") + "</div></button>").join("");
  }
  function viewStation(sid) {
    const s = G.stations[sid], d = stDay(sid), bi = curBand();
    const R = G.run;
    let arr = 0, cap = 0;
    s.lines.forEach((li) => {
      const p = G.lines[li].st.indexOf(sid);
      const D = R ? R.D : RL.buildDemand(G, G.day);
      arr += (D.lines[li].bands[bi][0][p].r + D.lines[li].bands[bi][1][p].r) * 60;
      cap += RL.capOf(G, li, bi, D.mods);
    });
    let h = '<div class="back"><button class="ib" data-a="back">←</button><div class="ttl">' + s.nm + "</div></div>";
    h += '<div class="note">路線：' + s.lines.map((li) => lineDot(li) + G.lines[li].nm).join("　") + "</div>";
    const SP = RL.stationPop(G)[sid];
    h += '<div class="card"><div class="ct">' + B[bi].nm + "（" + (R ? "いま" : "運行前の見込み") + "）</div><div class=\"kgrid\">"
      + kv("待機乗客", R ? N(RL.waitingAt(G, sid)) : "—", "big", "人") + kv("1時間需要", N(arr), "big", "人/h（この駅から乗る人）")
      + kv("輸送力", N(cap), "", "人/h（通る路線の合計・片方向）") + kv("積み残し", N(d.left), d.left > 50 ? "warn" : "", "人（延べ・" + (R ? "本日" : "きのう") + "）")
      + kv("平均待ち時間", d.board ? min1(d.wait) : "—") + kv("1日の乗車", N(d.board), "", R ? "本日ここまで" : "きのう") + "</div></div>";
    h += '<div class="card"><div class="ct">駅のまわり</div><div class="kgrid s">' + kv("住んでいる人", N(SP.res)) + kv("働く人", N(SP.jobs)) + kv("商業", s.com.toFixed(1))
      + kv("学校", s.sch ? "あり" : "—") + kv("大学", s.uni ? "あり" : "—") + kv("観光", s.tour ? "あり" : "—") + kv("イベント施設", s.venue ? "あり" : "—") + kv("発展度", "×" + s.dev.toFixed(2)) + "</div></div>";
    h += '<div class="card"><div class="ct">駅設備</div><div class="kgrid s">' + kv("ホームの長さ", s.plat + "両分") + kv("設備レベル", "Lv." + s.fac, "", "乗り降りが速くなる（混雑時の遅延が減る）") + "</div>"
      + '<div class="brow"><button class="btn sm pri" data-a="plat" data-v="' + sid + '"' + (s.plat >= 10 ? " disabled" : "") + ">ホームを延ばす +2両（" + Y(RL.platCost(G, s)) + '）</button>'
      + '<button class="btn sm pri" data-a="fac" data-v="' + sid + '"' + (s.fac >= 3 ? " disabled" : "") + ">設備を拡張（" + Y(RL.facCost(s)) + '）</button><button class="btn sm gh" data-a="facdown" data-v="' + sid + '"' + (s.fac <= 0 ? " disabled" : "") + ">設備を縮小</button></div>"
      + '<div class="note">路線の最大両数は、その路線で<b>いちばん短いホーム</b>で決まります。設備の維持費はレベルごとに増えます。</div></div>';
    const rows = R ? R.stS[sid] : G.report ? G.report.stations[sid] : null;
    if (rows) h += chartBox("cSt", "時間帯別の乗車と積み残し（" + (R ? "本日" : "きのう") + "）", [
      { nm: "乗車", c: C_CAP, type: "bar", data: rows.map((x) => Math.round(x.board)) },
      { nm: "積み残し", c: C_LEFT, type: "bar", data: rows.map((x) => Math.round(x.left)) },
    ], { labels: BL, sub: B.map((b) => b.nm), tfmt: (v) => N(v) + " 人" });
    return h;
  }

  /* ══════════ 都市 ══════════ */
  function viewCity() {
    const def = RL.CITIES[G.cityId], c = G.city, last = G.hist[G.hist.length - 1];
    const share = G.lines.reduce((a, L, li) => a + RL.railShare(G, li), 0) / G.lines.length;
    const cnt = (f) => G.stations.filter(f).length;
    const g = G.report ? G.report.g : 0;
    let h = '<div class="card"><div class="ct">' + def.nm + "（" + def.ja + "）</div><div class=\"kgrid s\">"
      + kv("総人口", N(c.pop)) + kv("昼間人口", N(c.pop * (0.9 + 0.12 * c.commerce) + c.tourists)) + kv("夜間人口", N(c.pop))
      + kv("人口増加率", (g >= 0 ? "+" : "") + (g * 100).toFixed(2) + "%/日", g < 0 ? "warn" : "")
      + kv("通勤率", "41%") + kv("通学率", "16%") + kv("自動車利用率", pct(clamp(def.carShare + (def.rail - share) * 0.8, 0.05, 0.9))) + kv("鉄道利用率", pct(share))
      + kv("観光客数", N(c.tourists) + "人/日") + kv("商業規模", "×" + c.commerce.toFixed(2)) + kv("オフィス規模", "×" + c.office.toFixed(2))
      + kv("学校数", cnt((s) => s.sch > 0)) + kv("大学数", cnt((s) => s.uni > 0)) + kv("観光施設数", cnt((s) => s.tour > 0)) + kv("イベント施設数", cnt((s) => s.venue)) + "</div>"
      + '<div class="note">鉄道が便利になる（待ち・積み残し・混雑が少ない）と、駅のまわりが発展し、人口もゆっくり増えます。逆に不便だと車に流れ、人口は伸び悩みます。</div></div>';
    const sc = RL.SCENARIOS.find((s) => s.id === G.scenario);
    h += '<div class="card"><div class="ct">シナリオ：' + sc.nm + (G.cleared ? ' <span class="okb">CLEAR</span>' : "") + "</div><div class=\"note\">" + sc.d + "</div>"
      + RL.goalState(G).map((x) => '<div class="goal' + (x.ok ? " ok" : "") + '"><span>' + (x.ok ? "✔" : "◇") + " " + x.tx + "</span><b>" + x.now + "</b></div>").join("") + "</div>";
    h += eventBanner();
    const hs = G.hist.slice(-30);
    if (hs.length) {
      h += chartBox("cPop", "人口推移", [{ nm: "人口", c: C_CAP, data: hs.map((x) => x.pop) }], { labels: hs.map((x) => "D" + x.day), tfmt: (v) => N(v) + " 人" });
      h += chartBox("cRid", "鉄道利用者数推移", [{ nm: "利用者", c: C_OK, data: hs.map((x) => x.riders) }], { labels: hs.map((x) => "D" + x.day), tfmt: (v) => N(v) + " 人" });
    }
    return h;
  }

  /* ══════════ 経営 ══════════ */
  function viewBiz() {
    const def = RL.CITIES[G.cityId], rp = G.report;
    let h = "";
    if (G.cash < 0) {
      h += '<div class="card crisis"><div class="ct">⚠ 経営危機（' + G.crisis + " 日目）</div><div class=\"note\">資金がマイナスです。14日続くと経営破綻になります。立て直しの手段：</div>"
        + '<div class="brow"><button class="btn sm pri" data-a="borrow">借入する</button><button class="btn sm" data-a="tab" data-v="veh">車両を売却</button><button class="btn sm" data-a="plan">減便する</button><button class="btn sm" data-a="tab" data-v="st">駅設備を縮小</button></div></div>';
    }
    h += '<div class="card"><div class="ct">資金</div><div class="kgrid">' + kv("資金", Y(G.cash), G.cash < 0 ? "neg big" : "big") + kv("借入", Y(G.loan), "", "上限 " + Y(def.loanMax) + "・利息 0.04%/日") + kv("累計利益", Y(G.cum), G.cum >= 0 ? "pos" : "neg") + "</div>"
      + '<div class="brow"><button class="btn sm" data-a="borrow">借入（' + Y(def.loanMax / 5) + '）</button><button class="btn sm gh" data-a="repay">返済（' + Y(def.loanMax / 5) + "）</button></div></div>";
    h += '<div class="card"><div class="ct">運賃（1回の乗車）</div><div class="fare"><button data-a="fare" data-v="-10">−10</button><b>¥' + G.fare + '</b><button data-a="fare" data-v="10">＋10</button></div>'
      + '<div class="note">基準は ¥' + def.refFare + "。運賃は<b>運賃収入</b>・<b>鉄道を選ぶ人の割合</b>（需要）・<b>運賃の満足度</b>の3つに同時に効きます。変えた日の運行から反映されます。</div></div>";
    if (rp) {
      h += '<div class="card"><div class="ct">きのうの収支（Day ' + rp.day + "）</div>"
        + '<div class="fin">' + [["運賃収入", rp.rev, 1], ["運行費", -rp.cost.op], ["車両維持費", -rp.cost.veh], ["駅維持費", -rp.cost.st], ["車両基地", -rp.cost.depot], ["支払利息", -rp.cost.interest], ["その他経費", -rp.cost.other]]
          .map((r) => '<div><span>' + r[0] + "</span><b class=\"" + (r[1] >= 0 ? "pos" : "neg") + '">' + (r[1] >= 0 ? "+" : "") + Y(r[1]) + "</b></div>").join("")
        + '<div class="tot"><span>利益</span><b class="' + (rp.profit >= 0 ? "pos" : "neg") + '">' + (rp.profit >= 0 ? "+" : "") + Y(rp.profit) + "</b></div></div></div>";
      h += satCard(rp);
    }
    /* グラフ */
    const GS = [["dc", "需要と輸送力"], ["hr", "時間帯別乗客数"], ["lf", "時間帯別乗車率"], ["lt", "時間帯別積み残し"], ["pf", "利益推移"], ["pp", "人口推移"], ["rd", "利用者数推移"], ["ln", "路線別利用者"], ["vu", "車両稼働率"]];
    h += '<div class="sec"><b>グラフ</b></div><div class="chips wrap">' + GS.map((x) => '<button class="' + (graphSel === x[0] ? "on" : "") + '" data-a="graph" data-v="' + x[0] + '">' + x[1] + "</button>").join("") + "</div>";
    h += graphHTML(graphSel);
    return h;
  }
  function satCard(rp) {
    const P = rp.parts;
    const why = {
      wait: "平均 " + min1(rp.wait), left: "延べ " + N(rp.left) + " 人（" + (rp.riders ? (rp.left / (rp.riders + rp.left) * 100).toFixed(1) : "0") + "%）",
      crowd: "ピーク区間の平均 " + pct(rp.load), fare: "¥" + G.fare + "（基準 ¥" + RL.CITIES[G.cityId].refFare + "）",
      punct: "平均遅延 " + min1(rp.delay) + (rp.cancel ? " ・ 運休 " + rp.cancel + " 本" : ""), comfort: "車両の快適性と混雑から",
    };
    const nm = { wait: "待ち時間", left: "積み残し", crowd: "混雑", fare: "運賃", punct: "定時性", comfort: "快適性" };
    const ic = { wait: "⏱", left: "👥", crowd: "🚃", fare: "¥", punct: "🕘", comfort: "💺" };
    return '<div class="card"><div class="ct">乗客満足度 <b class="bigsat">' + rp.sat + "</b><small>/100</small></div>"
      + Object.keys(nm).map((k) => '<div class="sat"><span>' + ic[k] + " " + nm[k] + '</span><div class="bar"><i style="width:' + P[k] + "%;background:" + (P[k] >= 70 ? C_OK : P[k] >= 45 ? "#eda100" : C_LEFT) + '"></i></div><b>' + P[k] + "</b><em>" + why[k] + "</em></div>").join("")
      + '<div class="note">各項目の点数と、その元になった数字です。合計点は重みづけした平均（待ち時間と積み残しが重め）。</div></div>';
  }
  function graphHTML(k) {
    const rp = G.report, hs = G.hist.slice(-30);
    const need = (x) => (x ? "" : '<div class="card note">1日運行すると表示されます。</div>');
    if (k === "dc") {
      const pv = RL.preview(G);
      return chartBox("gDC", "需要と輸送力（全路線の合計）", [
        { nm: "需要", c: C_DEM, data: B.map((b, i) => Math.round(pv.reduce((a, l) => a + l[i].dem, 0))) },
        { nm: "輸送力", c: C_CAP, data: B.map((b, i) => Math.round(pv.reduce((a, l) => a + l[i].cap, 0))) },
      ], { labels: BL, sub: B.map((b) => b.nm), tfmt: (v) => N(v) + " 人/h", note: "路線ごとの内訳は、運行 → 路線をタップ。" });
    }
    if (!rp && (k === "hr" || k === "lf" || k === "lt" || k === "ln" || k === "vu")) return need(false);
    if (k === "hr") return chartBox("gHR", "時間帯別乗客数（きのう）", [{ nm: "乗車", c: C_CAP, type: "bar", data: rp.bands.map((b) => Math.round(b.board)) }], { labels: BL, sub: B.map((b) => b.nm), tfmt: (v) => N(v) + " 人" });
    if (k === "lf") return chartBox("gLF", "時間帯別乗車率（きのう・全区間の平均）", [{ nm: "平均乗車率", c: C_LOAD, data: rp.bands.map((b) => Math.round(b.eff * 100)) }], { labels: BL, sub: B.map((b) => b.nm), yfmt: (v) => Math.round(v) + "%", max: 100 });
    if (k === "lt") return chartBox("gLT", "時間帯別積み残し（きのう・延べ）", [{ nm: "積み残し", c: C_LEFT, type: "bar", data: rp.bands.map((b) => Math.round(b.left)) }], { labels: BL, sub: B.map((b) => b.nm), tfmt: (v) => N(v) + " 人" });
    if (k === "ln") return chartBox("gLN", "路線別利用者（きのう）", [{ nm: "利用者", c: C_CAP, type: "bar", data: rp.lineRes.map((x) => Math.round(x.riders)) }], { labels: G.lines.map((L) => L.nm.replace(" Line", "")), tfmt: (v) => N(v) + " 人", h: 190 });
    if (k === "vu") { const own = RL.totalCars(G); return chartBox("gVU", "車両稼働率（きのう・時間帯別）", [{ nm: "稼働率", c: C_OK, type: "bar", data: rp.useBand.map((u) => Math.round(u / Math.max(1, own) * 100)) }], { labels: BL, sub: B.map((b) => b.nm), yfmt: (v) => Math.round(v) + "%", max: 100 }); }
    if (!hs.length) return need(false);
    if (k === "pf") return chartBox("gPF", "利益推移", [{ nm: "利益", c: C_CAP, type: "bar", data: hs.map((x) => x.profit) }], { labels: hs.map((x) => "D" + x.day), tfmt: (v) => Y(v) });
    if (k === "pp") return chartBox("gPP", "人口推移", [{ nm: "人口", c: C_CAP, data: hs.map((x) => x.pop) }], { labels: hs.map((x) => "D" + x.day), tfmt: (v) => N(v) + " 人" });
    if (k === "rd") return chartBox("gRD", "鉄道利用者数推移", [{ nm: "利用者", c: C_OK, data: hs.map((x) => x.riders) }], { labels: hs.map((x) => "D" + x.day), tfmt: (v) => N(v) + " 人" });
    return "";
  }

  /* ══════════ 日次レポート ══════════ */
  function showReport(rp) {
    const d = rp.pop - rp.popBefore;
    const lvI = ["", "ℹ", "⚠", "⛔"];
    let h = '<div class="rep"><div class="rh">DAILY REPORT <span>Day ' + rp.day + "</span></div>";
    if (G.justCleared) { G.justCleared = false; h += '<div class="clear">🎉 シナリオクリア！ <small>' + RL.SCENARIOS.find((s) => s.id === G.scenario).nm + " を " + rp.day + " 日で達成しました。このまま運営を続けられます。</small></div>"; }
    if (G.over) h += '<div class="clear bad">経営破綻 <small>資金のマイナスが14日続きました。</small></div>';
    if (G.failed && !G.cleared) h += '<div class="clear bad">期限切れ <small>目標の期間を過ぎました（運営は続けられます）。</small></div>';
    h += '<div class="kgrid">' + kv("人口", N(rp.pop), "", (d >= 0 ? "+" : "") + N(d)) + kv("鉄道利用者", N(rp.riders)) + kv("平均乗車率", pct(rp.avgLoad), "", "全区間の平均")
      + kv("積み残し", N(rp.left), rp.left > 100 ? "warn" : "", "延べ人数") + kv("平均待ち時間", min1(rp.wait)) + kv("満足度", rp.sat + "", "", stars(rp.sat))
      + kv("運賃収入", Y(rp.rev)) + kv("総費用", Y(rp.costT)) + kv("利益", (rp.profit >= 0 ? "+" : "") + Y(rp.profit), rp.profit >= 0 ? "pos big" : "neg big") + "</div>";
    h += '<div class="iss"><b>TODAY\'S ISSUES</b>' + (rp.issues.length ? rp.issues.map((x) => '<div class="lv' + x.lv + '"><i>' + lvI[x.lv] + "</i>" + x.t + "</div>").join("") : '<div class="lv1"><i>ℹ</i>大きな問題は見つかりませんでした。</div>') + "</div>";
    h += '<div class="goals">' + RL.goalState(G).map((x) => '<div class="goal' + (x.ok ? " ok" : "") + '"><span>' + (x.ok ? "✔" : "◇") + " " + x.tx + "</span><b>" + x.now + "</b></div>").join("") + "</div>";
    h += G.over ? '<button class="btn pri" data-a="gameover">タイトルへ</button>' : '<button class="btn pri" data-a="nextday">次の日へ</button>';
    h += "</div>";
    open(h);
  }

  /* ══════════ 進行（ループ）══════════ */
  function startDayIfNeeded() {
    if (G.run || G.over) return;
    RL.applyPermanent(G);
    RL.startDay(G);
  }
  function tick(ts) {
    requestAnimationFrame(tick);
    if (!G) { lastTs = ts; return; }
    const dt = Math.min(0.1, (ts - lastTs) / 1000); lastTs = ts;
    if (running && G.run) {
      const done = RL.stepTo(G, clockOf(G.run) + dt * MPS * (G.speed || 1));
      if (tab === "run" && !sub) drawTrains();
      if (done) finishDay();
    }
    if (ts - lastUi > 700 && ts > holdUi && !pressing && running) { lastUi = ts; renderHud(); if (!$("#ov").classList.contains("on")) renderView(); }
  }
  function finishDay() {
    running = false;
    const rp = RL.endDay(G);
    renderAll();
    showReport(rp);
  }

  /* ══════════ 入力 ══════════ */
  function stepVal(list, v, d) { let i = list.indexOf(v); if (i < 0) i = list.findIndex((x) => x > v); i = clamp((i < 0 ? list.length - 1 : i) + d, 0, list.length - 1); return list[i]; }
  function confirmBuy(vk, n, sell) {
    const x = V[vk];
    open('<div class="ct">' + (sell ? "売却" : "購入") + "の確認</div><p>" + x.nm + " を <b>" + n + " 両</b>" + (sell ? "売却します。受け取り " + Y(x.price * 0.45 * n) : "購入します。代金 " + Y(x.price * n)) + "（資金 " + Y(G.cash) + "）</p>"
      + '<div class="brow"><button class="btn gh" data-a="close">やめる</button><button class="btn pri" data-a="' + (sell ? "sellok" : "buyok") + '" data-v="' + vk + ":" + n + '">' + (sell ? "売却する" : "購入する") + "</button></div>");
  }
  const ACT = {
    newgame: () => renderSelect(),
    continue: () => { const s = RL.load(); if (s) startGame(s); },
    totitle: () => renderTitle(),
    pick: (v) => { RL.clearSave(); const g = RL.newGame(v); RL.save(g); startGame(g); open(helpHTML(true)); },
    help: () => open(helpHTML(false)),
    close,
    tab: (v) => { tab = v; sub = null; close(); paintNav(); renderView(); $("#view").scrollTop = 0; },
    back: () => { sub = null; renderView(); },
    line: (v) => { sub = { k: "line", li: +v }; if (G.run) sub.bi = curBand(); renderView(); $("#view").scrollTop = 0; },
    st: (v) => { sub = { k: "st", id: +v }; renderView(); $("#view").scrollTop = 0; },
    plan: () => { tab = "run"; paintNav(); close(); sub = { k: "plan" }; renderView(); $("#view").scrollTop = 0; },
    cell: (v) => { const [li, bi] = v.split(":").map(Number); bandSel = bi; sub = { k: "line", li, bi }; renderView(); $("#view").scrollTop = 0; },
    band: (v) => { bandSel = +v; if (sub && sub.k === "line") sub.bi = +v; renderView(); },
    pf: (v) => { const [li, bi, d] = v.split(":").map(Number); const P = G.plan[li][bi]; P.f = stepVal(RL.FREQS, P.f, d); RL.save(G); renderView(); renderHud(); },
    pc: (v) => { const [li, bi, d] = v.split(":").map(Number); const P = G.plan[li][bi]; const mx = RL.lineMaxCars(G, li); P.c = Math.min(mx, stepVal(RL.CARS, Math.min(P.c, mx), d)); RL.save(G); renderView(); },
    pv: (v) => { const [li, bi] = v.split(":").map(Number); const P = G.plan[li][bi]; const ks = RL.VKEYS; P.v = ks[(ks.indexOf(P.v) + 1) % ks.length]; RL.save(G); renderView(); },
    copyband: (v) => { const [li, bi] = v.split(":").map(Number); const P = G.plan[li][bi]; G.plan[li].forEach((x) => { x.f = P.f; x.c = P.c; x.v = P.v; }); RL.save(G); renderView(); toast("全時間帯を同じ設定にしました"); },
    play: () => {
      if (G.over) return;
      if (!G.run) { startDayIfNeeded(); running = true; toast("Day " + G.day + " の運行を開始"); }
      else running = !running;
      renderAll();
    },
    speed: (v) => { G.speed = +v; renderHud(); },
    skip: () => { if (G.over) return; startDayIfNeeded(); RL.stepTo(G, RL.DAY_END + 60); finishDay(); },
    nextday: () => { close(); renderAll(); },
    gameover: () => { close(); RL.clearSave(); G = null; renderTitle(); },
    buy: (v) => { const [vk, n] = v.split(":"); confirmBuy(vk, +n, false); },
    sell: (v) => { const [vk, n] = v.split(":"); confirmBuy(vk, +n, true); },
    buyok: (v) => { const [vk, n] = v.split(":"); const e = RL.buyCars(G, vk, +n); close(); toast(e || V[vk].nm + " を " + n + " 両購入しました"); RL.save(G); renderAll(); },
    sellok: (v) => { const [vk, n] = v.split(":"); const e = RL.sellCars(G, vk, +n); close(); toast(e || n + " 両を売却しました"); RL.save(G); renderAll(); },
    depot: () => { const e = RL.expandDepot(G); toast(e || "車両基地を拡張しました（収容 " + G.depot + " 両）"); RL.save(G); renderAll(); },
    plat: (v) => { const e = RL.extendPlat(G, +v); toast(e || "ホームを延ばしました"); RL.save(G); renderAll(); },
    fac: (v) => { const e = RL.upFac(G, +v); toast(e || "駅設備を拡張しました"); RL.save(G); renderAll(); },
    facdown: (v) => { const e = RL.downFac(G, +v); toast(e || "駅設備を縮小しました（維持費が下がります）"); RL.save(G); renderAll(); },
    borrow: () => { const e = RL.borrow(G, RL.CITIES[G.cityId].loanMax / 5); toast(e || "借入しました"); RL.save(G); renderAll(); },
    repay: () => { const e = RL.repay(G, RL.CITIES[G.cityId].loanMax / 5); toast(e || "返済しました"); RL.save(G); renderAll(); },
    fare: (v) => { G.fare = clamp(G.fare + +v, 100, 500); RL.save(G); renderAll(); },
    graph: (v) => { graphSel = v; renderView(); },
    mz: (v) => { if (v === "reset") { mv = { x: 0, y: 0, w: 1000, h: 700 }; mvApply(); } else mvZoom(v === "in" ? 1.4 : 1 / 1.4); },
    mfull: () => { mapFull = !mapFull; renderView(); },
    menu: () => open('<div class="ct">メニュー</div><div class="mlist">'
      + '<button class="btn" data-a="help">ヘルプ（遊びかた）</button>'
      + '<button class="btn" data-a="savequit">セーブしてタイトルへ</button>'
      + '<button class="btn gh" data-a="newgame2">都市を選びなおす（新しく始める）</button>'
      + '<a class="btn gh" href="../index.html">XEVARION へ</a></div><p class="note">セーブは1日の終わりごとに自動で行われます。運行中にやめると、その日は最初からやり直しになります。</p>'),
    savequit: () => { close(); running = false; if (G) { G.run = null; RL.save(G); } G = null; renderTitle(); },
    newgame2: () => { close(); running = false; renderSelect(); },
  };
  function helpHTML(first) {
    return '<div class="ct">' + (first ? "ようこそ、運行責任者さん" : "遊びかた") + "</div><div class=\"help\">"
      + "<p><b>MagiRail</b> は「線路を敷く」ゲームではなく、<b>数字を見て運行を決める</b>ゲームです。</p>"
      + "<ol><li><b>運行</b>タブの路線図で、路線をタップ。時間帯ごとの<b>需要</b>（いちばん混む区間を通る人/h）と<b>輸送力</b>（本数×両数×定員）を見くらべます。</li>"
      + "<li>時間帯ごとに <b>本数・両数・車両</b> を決めます。本数を増やすと待ち時間と積み残しが減りますが、運行費が増えます。</li>"
      + "<li>▶ で1日の運行がはじまります（1×〜8×、⏭ で一気に）。駅に人がたまり、来た列車に乗れなかった人は次の列車まで<b>積み残し</b>になります。</li>"
      + "<li>1日の終わりに <b>DAILY REPORT</b>。何が起きたかを数字で確認して、次の日の計画を直します。</li></ol>"
      + "<p>気をつけること</p><ul><li>車両は会社全体で共有。走っている列車は折り返すまで使えません。足りないと<b>運休</b>になります。</li>"
      + "<li>ホームの長さより長い編成は組めません（駅タブで延ばせます）。</li><li>混雑すると乗り降りに時間がかかり、<b>遅延</b>が起きます。</li>"
      + "<li>運賃は収入・需要・満足度の3つに効きます。</li><li>便利な鉄道は街を育て、人口が増えると需要も増えます。</li>"
      + "<li>資金がマイナスでもすぐには終わりません。借入・減便・車両売却・駅設備の縮小・運賃変更で立て直せます。</li></ul></div>"
      + '<button class="btn pri" data-a="close">' + (first ? "はじめる" : "とじる") + "</button>";
  }
  document.addEventListener("pointerdown", () => { holdUi = performance.now() + 700; }, true);
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-a]");
    if (!el) { if (e.target.id === "ov") close(); return; }
    const f = ACT[el.dataset.a];
    if (f) { e.preventDefault(); f(el.dataset.v || "", el); }
  });
  window.addEventListener("resize", () => { if (G) renderView(); });

  renderTitle();
  requestAnimationFrame(tick);
  window.RAILUI = { get G() { return G; } };
})();
