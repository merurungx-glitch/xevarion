/* ============================================================
   MagiQuiz — quiz-pad.js（問題中のメモ・電卓・公式）
   ★★ 2026-11-05 ご指定「問題中 MagiChemLex のようなメモや電卓を使用可能に」
   ------------------------------------------------------------
   ・MagiChemLex のメモ（mcl-ui.js の #pad）を、このアプリの中で動くように移したもの。
     手書き（色3つ・消しゴム・戻す・ピンチ／2本指で移動と拡大）／文字／関数電卓／定数と公式。
   ・ChemLex とちがって、メモは<b>試合の中だけ</b>（保存も同期もしない）。
     1台をみんなで回すので、次の問題では消す（「残す」にすると残る）。
   ・開いていても時間は止まらない（考える時間のうち）。
   ・横に広い画面は問題の右、せまい画面は下から。上のふちをドラッグすると高さ、左のふちで幅が変わる（端末に覚える）。
   ============================================================ */
(function () {
  "use strict";
  const MQ = window.MQ, U = MQ.U, FX = MQ.FX, D = window.MCL_DATA;
  const { $, $$, ic, esc } = U;
  const PAGES = 10, SIDE = 0.5;
  const PAD = { open: false, tab: "draw", col: 0, er: false, cur: null, ptr: null, built: false, keep: false, clrArm: 0,
    st: { strokes: [], text: "" }, view: { s: 1, ox: 0, oy: 0 }, hand: false, pans: null, ptrs: {}, off: null, topic: "" };
  const COLS = ["#241447", "#f0405a", "#2f6bff"];
  const el = () => $("#pad");

  /* ── 関数電卓（ChemLex と同じキー） ── */
  const CALC = { tk: [], ans: 0, out: "0" };
  const CK = [["7", "8", "9", "÷", "AC"], ["4", "5", "6", "×", "⌫"], ["1", "2", "3", "−", "("], ["0", ".", "EXP", "+", ")"], ["log", "ln", "√", "^", "="], ["10ˣ", "ANS", "R", "F", "Nₐ"]];
  const CV = { "÷": "/", "×": "*", "−": "-", "+": "+", "(": "(", ")": ")", "^": "^", ".": ".", EXP: "E", log: "log(", ln: "ln(", "√": "sqrt(", "10ˣ": "10^(", R: "(8.31E3)", F: "(9.65E4)", "Nₐ": "(6.02E23)" };
  const CD = { EXP: "ᴇ", log: "log(", ln: "ln(", "√": "√(", "10ˣ": "10^(", "Nₐ": "Nₐ" };
  function calcEval(str) {
    const tk = str.match(/\d+\.?\d*(?:E[+\-]?\d+)?|\.\d+(?:E[+\-]?\d+)?|log|ln|sqrt|[()+\-*/^]/g) || [];
    if (tk.join("") !== str.replace(/\s/g, "")) throw new Error("bad");
    let i = 0;
    const peek = () => tk[i], take = () => tk[i++];
    const isStart = (p) => p != null && (p === "(" || /^[\d.]/.test(p) || p === "log" || p === "ln" || p === "sqrt");
    function expr() { let v = term(); while (peek() === "+" || peek() === "-") { const o = take(), r = term(); v = o === "+" ? v + r : v - r; } return v; }
    function term() { let v = unary(); for (;;) { const p = peek(); if (p === "*" || p === "/") { take(); const r = unary(); v = p === "*" ? v * r : v / r; } else if (isStart(p)) v = v * unary(); else break; } return v; }
    function unary() { if (peek() === "-") { take(); return -unary(); } if (peek() === "+") { take(); return unary(); } return pow(); }
    function pow() { let b = prim(); if (peek() === "^") { take(); b = Math.pow(b, unary()); } return b; }
    function prim() {
      const t = take(); if (t == null) throw new Error("end");
      if (t === "(") { const v = expr(); if (peek() === ")") take(); return v; }
      if (t === "log" || t === "ln" || t === "sqrt") { const v = prim(); return t === "log" ? Math.log10(v) : t === "ln" ? Math.log(v) : Math.sqrt(v); }
      const n = Number(t); if (isNaN(n)) throw new Error("nan"); return n;
    }
    const v = expr(); if (i < tk.length) throw new Error("rest"); return v;
  }
  function fmtNum(v) {
    if (!isFinite(v)) return "エラー";
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e7 || a < 1e-4)) { const e = Math.floor(Math.log10(a)); const m = v / Math.pow(10, e); return String(+m.toPrecision(6)).replace("-", "−") + "×10<sup>" + String(e).replace("-", "−") + "</sup>"; }
    return String(+v.toPrecision(10)).replace("-", "−");
  }
  function mountCalc(box) {
    box.innerHTML = '<div class="cal"><div class="cal-d"><div class="cal-ex"></div><div class="cal-v">' + CALC.out + '</div></div><div class="cal-k">' +
      CK.map((r) => r.map((k) => '<button class="' + (/^\d$|^\.$/.test(k) ? "" : k === "=" ? "eq" : k === "AC" || k === "⌫" ? "ac" : "fn") + '" data-k="' + k + '">' + k + "</button>").join("")).join("") + "</div></div>";
    const exEl = box.querySelector(".cal-ex"), vEl = box.querySelector(".cal-v");
    const paint = () => {
      exEl.textContent = CALC.tk.map((t) => t.d).join("") || " "; vEl.innerHTML = CALC.out || "&nbsp;";
      exEl.scrollLeft = exEl.scrollWidth; vEl.scrollLeft = vEl.scrollWidth;
    };
    const calc = (final) => {
      let s = CALC.tk.map((t) => t.v).join("");
      if (!s) { CALC.out = "0"; return; }
      const open = (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
      for (let i = 0; i < open; i++) s += ")";
      try {
        const v = calcEval(s);
        if (!isFinite(v)) throw new Error("inf");
        if (final) { CALC.ans = v; CALC.out = fmtNum(v); } else CALC.out = '<span class="pv">' + fmtNum(v) + "</span>";
      } catch (e) { CALC.out = final ? '<span class="er">式を確かめてね</span>' : ""; }
    };
    box.querySelector(".cal-k").addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]"); if (!b) return;
      const k = b.dataset.k;
      if (k === "AC") { CALC.tk = []; CALC.out = "0"; }
      else if (k === "=") calc(true);
      else {
        if (k === "⌫") CALC.tk.pop();
        else if (k === "ANS") CALC.tk.push({ d: "Ans", v: "(" + String(CALC.ans).replace("e", "E") + ")" });
        else CALC.tk.push({ d: CD[k] || k, v: CV[k] != null ? CV[k] : k });
        calc(false);
      }
      paint(); FX.sfx("tap");
    });
    paint();
  }

  /* ── 定数・公式 ── */
  function constHTML() {
    return '<div class="cgrid">' + D.CONST.mass.map((p) => '<div class="ce"><b>' + p[0] + "</b><span>" + p[1] + "</span></div>").join("") + '</div><table class="ctab">' + D.CONST.other.map((p) => "<tr><th>" + p[0] + "</th><td>" + p[1] + "</td></tr>").join("") + "</table>";
  }
  function formHTML(only) {
    return Object.keys(D.FORM).filter((t) => !only || t === only).map((t) => '<details class="fcard"' + (only === t ? " open" : "") + "><summary>" + esc(D.T[t].nm) + "</summary><ul>" + D.FORM[t].map((x) => "<li>" + x + "</li>").join("") + "</ul></details>").join("");
  }
  function paintConst() {
    const box = $("#padConst"); if (!box) return;
    const t = PAD.topic;
    box.innerHTML = (t && D.FORM[t] ? '<h4 class="pd-h">この単元の公式</h4>' + formHTML(t) : "") + '<h4 class="pd-h">定数・原子量</h4>' + constHTML() + '<h4 class="pd-h">ほかの単元</h4>' + formHTML(null);
  }

  /* ── 組み立て ── */
  function build() {
    const box = el(); if (!box || box.dataset.built) return;
    box.dataset.built = "1";
    box.innerHTML = '<div class="pd-wg" id="padW" title="左右にドラッグで幅を変える"><i></i></div><div class="pd-g" id="padG" title="上下にドラッグで高さを変える"><i></i></div>' +
      '<div class="pd-h1"><div class="pd-tabs">' + [["draw", "pen", "手書き"], ["text", "keyboard", "文字"], ["calc", "calc", "電卓"], ["const", "table", "公式"]].map((t) => '<button data-pa="tab" data-v="' + t[0] + '">' + ic(t[1]) + "<span>" + t[2] + "</span></button>").join("") + '</div>' +
      '<button class="pd-x" data-pa="close" aria-label="閉じる">' + ic("x") + "</button></div>" +
      '<div class="pd-tools"><span class="pd-cols">' + COLS.map((c, i) => '<button class="pc" data-pa="col" data-v="' + i + '" style="--pc:' + c + '" aria-label="色"></button>').join("") + "</span>" +
      '<button class="pt" data-pa="er">' + ic("eraser") + "<span>消す</span></button>" +
      '<button class="pt" data-pa="undo">' + ic("undo") + "<span>戻す</span></button>" +
      '<button class="pt" data-pa="hand" title="紙を動かす（2本指でも動かせます）">' + ic("hand") + "<span>移動</span></button>" +
      '<button class="pt sq" data-pa="zoom" data-v="-1" aria-label="縮小">' + ic("zout") + '</button><b id="padZv">100%</b><button class="pt sq" data-pa="zoom" data-v="1" aria-label="拡大">' + ic("zin") + "</button>" +
      '<button class="pt" data-pa="clear">' + ic("trash") + '<span id="padClr">全部消す</span></button>' +
      '<label class="pd-keep"><input type="checkbox" id="padKeep"><span>次の問題に残す</span></label></div>' +
      '<div class="pd-b"><canvas class="pd-cv" id="padCv"></canvas><textarea class="pd-ta" id="padTa" placeholder="計算や考えたことを書けます"></textarea><div class="pd-calc" id="padCalc"></div><div class="pd-const" id="padConst"></div></div>';
    const ta = $("#padTa");
    ta.addEventListener("input", () => { PAD.st.text = ta.value; });
    $("#padKeep").addEventListener("change", (e) => { PAD.keep = e.target.checked; });
    box.addEventListener("click", onClick);
    bindCanvas(); bindGrip();
    window.addEventListener("resize", () => { if (PAD.open) fit(); });
    paintTools();
  }
  function paintTools() {
    $$("#pad [data-pa=col]").forEach((b, i) => b.classList.toggle("on", i === PAD.col && !PAD.er));
    const e = $('#pad [data-pa="er"]'); if (e) e.classList.toggle("on", PAD.er);
    const h = $('#pad [data-pa="hand"]'); if (h) h.classList.toggle("on", PAD.hand);
    const cv = $("#padCv"); if (cv) cv.classList.toggle("hand", PAD.hand);
  }
  function onClick(e) {
    const b = e.target.closest("[data-pa]"); if (!b) return;
    const a = b.dataset.pa, v = b.dataset.v;
    FX.sfx("tap");
    if (a === "tab") showTab(v);
    else if (a === "close") close();
    else if (a === "col") { PAD.col = +v; PAD.er = false; PAD.hand = false; paintTools(); }
    else if (a === "er") { PAD.er = !PAD.er; PAD.hand = false; paintTools(); }
    else if (a === "hand") { PAD.hand = !PAD.hand; paintTools(); }
    else if (a === "undo") { PAD.st.strokes.pop(); draw(); }
    else if (a === "zoom") { zoomAt(+v > 0 ? 1.25 : 0.8, 0.5, 0.3); }
    else if (a === "clear") {
      if (Date.now() - PAD.clrArm < 2200) { clear(); PAD.clrArm = 0; $("#padClr").textContent = "全部消す"; }
      else { PAD.clrArm = Date.now(); $("#padClr").textContent = "もう一度押すと消す"; setTimeout(() => { const c = $("#padClr"); if (c) c.textContent = "全部消す"; }, 2300); }
    }
  }
  function showTab(t) {
    PAD.tab = t;
    const box = el(); box.dataset.tab = t;
    $$("#pad .pd-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.v === t));
    if (t === "draw") requestAnimationFrame(fit);
    else if (t === "calc") { const c = $("#padCalc"); if (!c.firstChild) mountCalc(c); }
    else if (t === "const") paintConst();
    paintBtn();
  }
  function open(tab) {
    build();
    PAD.open = true;
    $("#play").classList.add("pad-on");
    showTab(tab || PAD.tab);
    requestAnimationFrame(fit);
  }
  function close() {
    PAD.open = false;
    const p = $("#play"); if (p) p.classList.remove("pad-on");
    paintBtn();
  }
  function toggle(tab) { if (PAD.open && PAD.tab === tab) close(); else open(tab); }
  function clear() {
    PAD.st.strokes = []; PAD.st.text = "";
    const ta = $("#padTa"); if (ta) ta.value = "";
    draw();
  }
  /* 次の問題へ：ふだんは消す（「次の問題に残す」のときは残す） */
  function next(topic) {
    PAD.topic = topic || "";
    if (!PAD.keep) clear();
    if (PAD.open && PAD.tab === "const") paintConst();
  }
  /* 問題の下の「メモ」ボタンの光 */
  function paintBtn() {
    $$('[data-a="pad"]').forEach((b) => b.classList.toggle("on", PAD.open && b.dataset.v === PAD.tab));
  }

  /* ── 取っ手 ── */
  function bindGrip() {
    const gr = $("#padG"), pl = $("#play"), wg = $("#padW");
    let y0 = 0, h0 = 0, on = false, won = false;
    try { const h = Number(localStorage.getItem("magiquiz_pad_h")); if (h > 120) pl.style.setProperty("--padH", Math.min(h, Math.max(200, innerHeight - 180)) + "px"); } catch (e) {}
    try { const w = Number(localStorage.getItem("magiquiz_pad_w")); if (w >= 30 && w <= 70) pl.style.setProperty("--padW", w + "%"); } catch (e) {}
    gr.addEventListener("pointerdown", (ev) => { on = true; y0 = ev.clientY; h0 = el().getBoundingClientRect().height; try { gr.setPointerCapture(ev.pointerId); } catch (e) {} ev.preventDefault(); });
    gr.addEventListener("pointermove", (ev) => { if (!on) return; const h = Math.max(170, Math.min(innerHeight * 0.86, h0 + (y0 - ev.clientY))); pl.style.setProperty("--padH", Math.round(h) + "px"); fit(); });
    const end = () => { if (!on) return; on = false; try { localStorage.setItem("magiquiz_pad_h", String(Math.round(el().getBoundingClientRect().height))); } catch (e) {} };
    gr.addEventListener("pointerup", end); gr.addEventListener("pointercancel", end);
    wg.addEventListener("pointerdown", (ev) => { won = true; try { wg.setPointerCapture(ev.pointerId); } catch (e) {} ev.preventDefault(); });
    wg.addEventListener("pointermove", (ev) => { if (!won) return; const r = pl.getBoundingClientRect(), pct = Math.max(30, Math.min(70, (r.right - ev.clientX) / r.width * 100)); pl.style.setProperty("--padW", pct.toFixed(1) + "%"); fit(); });
    const wend = () => { if (!won) return; won = false; try { localStorage.setItem("magiquiz_pad_w", String(Math.round(parseFloat(pl.style.getPropertyValue("--padW"))))); } catch (e) {} };
    wg.addEventListener("pointerup", wend); wg.addEventListener("pointercancel", wend);
  }

  /* ── 手書き（線は紙の幅を 1 とした座標） ── */
  function clamp() {
    const v = PAD.view, cv = $("#padCv");
    v.s = Math.max(0.6, Math.min(3, v.s));
    let lo = -SIDE, hi = 1 + SIDE - 1 / v.s;
    if (hi < lo) lo = hi = (lo + hi) / 2;
    v.ox = Math.max(lo, Math.min(hi, v.ox));
    const ar = cv && cv.width ? cv.height / cv.width : 0.6;
    v.oy = Math.max(0, Math.min(PAGES - ar / v.s, v.oy));
    const zv = $("#padZv"); if (zv) zv.textContent = Math.round(v.s * 100) + "%";
  }
  function zoomAt(f, fx, fy) {
    const v = PAD.view, ns = Math.max(0.6, Math.min(3, v.s * f));
    const px = fx / v.s + v.ox, py = fy / v.s + v.oy;
    v.s = ns; v.ox = px - fx / ns; v.oy = py - fy / ns;
    clamp(); draw();
  }
  function fit() {
    const cv = $("#padCv"); if (!cv) return;
    const r = cv.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    draw();
  }
  function draw() {
    const cv = $("#padCv"); if (!cv || !cv.width) return;
    const g = cv.getContext("2d"), W = cv.width, H = cv.height;
    const off = PAD.off || (PAD.off = document.createElement("canvas"));
    if (off.width !== W || off.height !== H) { off.width = W; off.height = H; }
    const og = off.getContext("2d"); og.clearRect(0, 0, W, H);
    const V = PAD.view, dpr = Math.min(3, window.devicePixelRatio || 1), penMin = 2.4 * dpr / V.s, erMin = 20 * dpr / V.s;
    PAD.st.strokes.concat(PAD.cur ? [PAD.cur] : []).forEach((s) => {
      const p = s.p; if (!p || !p.length) return;
      og.save(); og.setTransform(V.s, 0, 0, V.s, -V.ox * V.s * W, -V.oy * V.s * W); og.lineCap = "round"; og.lineJoin = "round";
      og.globalCompositeOperation = s.e ? "destination-out" : "source-over";
      og.strokeStyle = COLS[s.c || 0] || COLS[0];
      og.lineWidth = Math.max((s.e ? 0.05 : 0.0055) * W, s.e ? erMin : penMin);
      og.beginPath(); og.moveTo(p[0][0] * W, p[0][1] * W);
      if (p.length === 1) og.lineTo(p[0][0] * W + 0.1, p[0][1] * W);
      for (let i = 1; i < p.length; i++) og.lineTo(p[i][0] * W, p[i][1] * W);
      og.stroke(); og.restore();
    });
    g.clearRect(0, 0, W, H);
    const step = W / 24 * V.s, gx0 = -((V.ox * W * V.s) % step), gy0 = -((V.oy * W * V.s) % step);
    g.save(); g.strokeStyle = "rgba(90,50,170,.12)"; g.lineWidth = 1;
    for (let x = gx0; x < W; x += step) { if (x <= 0) continue; const px = Math.round(x) + 0.5; g.beginPath(); g.moveTo(px, 0); g.lineTo(px, H); g.stroke(); }
    for (let y = gy0; y < H; y += step) { if (y <= 0) continue; const py = Math.round(y) + 0.5; g.beginPath(); g.moveTo(0, py); g.lineTo(W, py); g.stroke(); }
    g.restore();
    g.drawImage(off, 0, 0);
  }
  function bindCanvas() {
    const cv = $("#padCv");
    const raw = (ev) => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.width]; };
    const pt = (ev) => { const a = raw(ev), V = PAD.view; return [a[0] / V.s + V.ox, a[1] / V.s + V.oy]; };
    cv.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const r = cv.getBoundingClientRect(), V = PAD.view;
      if (ev.ctrlKey || ev.metaKey) { const a = raw(ev); zoomAt(Math.exp(-ev.deltaY * 0.0022), a[0], a[1]); return; }
      const dx = ev.shiftKey ? ev.deltaY : ev.deltaX, dy = ev.shiftKey ? 0 : ev.deltaY;
      V.ox += dx / (r.width * V.s); V.oy += dy / (r.width * V.s);
      clamp(); draw();
    }, { passive: false });
    cv.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
      if (ev.pointerType === "mouse" || ev.isPrimary) { PAD.ptrs = {}; PAD.pans = null; }
      PAD.ptrs[ev.pointerId] = raw(ev);
      const ids = Object.keys(PAD.ptrs);
      if (ids.length >= 2) {
        PAD.cur = null;
        const a = PAD.ptrs[ids[0]], b = PAD.ptrs[ids[1]];
        PAD.pans = { two: true, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 0.01 };
        draw(); return;
      }
      if (PAD.hand || ev.button === 1) { PAD.pans = { two: false, x: PAD.ptrs[ev.pointerId][0], y: PAD.ptrs[ev.pointerId][1] }; return; }
      if (ev.button > 0) return;
      PAD.ptr = pt(ev);
      PAD.cur = { c: PAD.col, e: PAD.er ? 1 : 0, p: [PAD.ptr] };
      draw();
    });
    cv.addEventListener("pointermove", (ev) => {
      if (PAD.ptrs[ev.pointerId]) PAD.ptrs[ev.pointerId] = raw(ev);
      if (PAD.pans) {
        ev.preventDefault();
        const V = PAD.view, P2 = PAD.pans, ids = Object.keys(PAD.ptrs);
        if (P2.two && ids.length >= 2) {
          const a = PAD.ptrs[ids[0]], b = PAD.ptrs[ids[1]], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 0.01;
          V.ox -= (mx - P2.mx) / V.s; V.oy -= (my - P2.my) / V.s;
          const f = d / P2.d; if (Math.abs(f - 1) > 0.002) zoomAt(f, mx, my);
          P2.mx = mx; P2.my = my; P2.d = d;
        } else if (!P2.two) {
          const c = PAD.ptrs[ev.pointerId] || raw(ev);
          V.ox -= (c[0] - P2.x) / V.s; V.oy -= (c[1] - P2.y) / V.s; P2.x = c[0]; P2.y = c[1];
        }
        clamp(); draw(); return;
      }
      PAD.ptr = pt(ev);
      if (!PAD.cur) return;
      ev.preventDefault();
      const q = PAD.ptr, last = PAD.cur.p[PAD.cur.p.length - 1];
      if (Math.abs(q[0] - last[0]) < 0.002 && Math.abs(q[1] - last[1]) < 0.002) return;
      PAD.cur.p.push([+q[0].toFixed(4), +q[1].toFixed(4)]);
      draw();
    });
    const end = (ev) => {
      if (ev && ev.pointerId != null) delete PAD.ptrs[ev.pointerId];
      if (PAD.pans) { if (!Object.keys(PAD.ptrs).length || !PAD.pans.two) PAD.pans = null; return; }
      if (!PAD.cur) return;
      PAD.st.strokes.push(PAD.cur); PAD.cur = null;
      if (PAD.st.strokes.length > 400) PAD.st.strokes.splice(0, PAD.st.strokes.length - 400);
      draw();
    };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
    cv.addEventListener("pointerleave", (ev) => { if (!PAD.pans) end(ev); });
  }

  MQ.Pad = { open, close, toggle, clear, next, paintBtn, get isOpen() { return PAD.open; }, reset: () => { PAD.keep = false; PAD.built = false; close(); clear(); const k = $("#padKeep"); if (k) k.checked = false; } };
})();
