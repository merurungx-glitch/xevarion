/* ============================================================
   MagiChemLex — mcl-bingo.js（ビンゴカード）★★ 2026-10-28 新規
   ------------------------------------------------------------
   ご指定「MagiChemLex：ビンゴカードを豪華に追加」（MagiLex のビンゴは廃止＝補填はメール）
   ・5×5＝25マス。まん中（13マス目）は FREE（金の元素カード Au）で最初から開いている。
     ほかの24マスは、毎月1日に月の文字から決まる並びで 28個のミッションから選ぶ（同じ月なら、どの端末でも同じカード）。
   ・マスは周期表の元素カードの形（原子番号・元素記号・族の色）。条件を満たすと金色になって印（ベンゼン環のはんこ）が押される。
   ・縦5・横5・斜め2 の12ライン。そろうと線が光り、「受け取る」で BINGO! の演出とごほうび。
     ごほうび：よこ・たて1列 1,200 XEVA＋🎫1 ／ ななめ 2,000 XEVA＋💎2 ／ 3ライン 💱両替チケット×2 ／ 6ライン 🎟ガチャ10連半額券×1 ／
               25マス コンプリート 12,000 XEVA＋💎8＋🎫5＋🎟半額券×1。XEVA はほかのごほうびと同じくイベントの倍率がかかる（M.earn・理由の頭は「MagiChemLex」）。
   ★ ミッションの達成は「いまの記録を数え直す」（記録は magichemlex_v1：days・rw の印の時刻・q・memo・bm など）。
     いちど開いたマスは rw["bgo:<月>:<ミッション>"] に印（ブックマークを外しても閉じない）。受け取りは rw["bg:<月>:…"]。
     rw はクラウドで<b>和</b>で混ざるので、ほかの端末で開いたマス・受け取ったラインも残る（2台で同時に受け取らないよう、受け取る前にクラウドを取りこむ）。
   ★ ランダム10問の 90%以上は mcl-core.js の finishMix が rw["bgc:mix:<時刻>"] を足す（何度でも数える）。
   ============================================================ */
(function () {
  "use strict";
  const M = window.MCL, U = window.MCLUI;
  if (!M || !U) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = M.esc, ic = U.ic;
  const DAY = 86400000;
  const pad = (n) => String(n).padStart(2, "0");
  function monthKey(t) { const d = t != null ? new Date(t) : new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1); }
  const inMonth = (ts, mk) => !!ts && typeof ts === "number" && monthKey(ts) === mk;

  /* ══ ごほうび ══ */
  const RW = {
    line: { xeva: 1200, tk: 1 },
    diag: { xeva: 2000, gem: 2 },
    b3: { cash: 2 },               /* 3ライン */
    b6: { half: 1 },               /* 6ライン */
    all: { xeva: 12000, gem: 8, tk: 5, half: 1 },
  };

  /* ══ その月の記録（数え直す）══ */
  function stat(mk) {
    const s = M.get(), rw = s.rw || {};
    const days = Object.keys(s.days || {}).filter((d) => d.slice(0, 7) === mk && (s.days[d] || 0) > 0).sort();
    const sum = days.reduce((a, d) => a + (s.days[d] || 0), 0);
    const max = days.reduce((a, d) => Math.max(a, s.days[d] || 0), 0);
    let run = 0, best = 0, prev = null;
    days.forEach((d) => { const t = new Date(d + "T00:00:00").getTime(); run = prev != null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1; prev = t; best = Math.max(best, run); });
    let first = 0, topic = 0, gm = 0, cf = 0, daily = 0, mix = 0, wp = 0;
    const book = {};
    Object.keys(rw).forEach((k) => {
      const v = rw[k];
      if (k.indexOf("daily:") === 0) { if (k.slice(6, 13) === mk) daily++; return; }
      if (!inMonth(v, mk)) return;
      if (k.indexOf("first:") === 0) first++;
      else if (k.indexOf("topic:") === 0) topic++;
      else if (k.indexOf("gm:") === 0) gm++;
      else if (k.indexOf("cf:") === 0) cf++;
      else if (k.indexOf("bgc:mix:") === 0) mix++;
      else if (k.indexOf("wp:gm:") === 0) wp += 5;
      else if (k.indexOf("wp:cf:") === 0) wp += 10;
      else if (/^set:.+:(60|80|100)$/.test(k)) book[k.replace(/:(60|80|100)$/, "")] = 1;
    });
    let mas = 0;
    Object.keys(s.q || {}).forEach((id) => { const r = s.q[id]; if (r && (r.lv || 0) >= 2 && r.last && String(r.lastOk || "").slice(0, 7) === mk) mas++; });
    let memo = 0; Object.keys(s.memo || {}).forEach((id) => { const m = s.memo[id]; if (m && m.t && inMonth(m.at, mk)) memo++; });
    let bm = 0; Object.keys(s.bm || {}).forEach((id) => { if (inMonth(s.bm[id], mk)) bm++; });
    return { sum, max, days: days.length, run: best, first, topic, gm, cf, daily, mix, wp, book: Object.keys(book).length, mas, memo, bm };
  }

  /* ══ ミッション（ここに1行足せばカードの候補に入る）══ */
  const MS = [
    { id: "a50", nm: "今月 50問 解く", ic: "list", need: 50, v: (x) => x.sum },
    { id: "a150", nm: "今月 150問 解く", ic: "list", need: 150, v: (x) => x.sum },
    { id: "a300", nm: "今月 300問 解く", ic: "lib", need: 300, v: (x) => x.sum },
    { id: "d20", nm: "1日で 20問 解く", ic: "flash", need: 20, v: (x) => x.max },
    { id: "d40", nm: "1日で 40問 解く", ic: "flash", need: 40, v: (x) => x.max },
    { id: "s5", nm: "今月 5日 学習", ic: "cal", need: 5, v: (x) => x.days },
    { id: "s10", nm: "今月 10日 学習", ic: "cal", need: 10, v: (x) => x.days },
    { id: "s15", nm: "今月 15日 学習", ic: "cal", need: 15, v: (x) => x.days },
    { id: "r3", nm: "3日つづけて学習", ic: "flame", need: 3, v: (x) => x.run },
    { id: "r7", nm: "7日つづけて学習", ic: "flame", need: 7, v: (x) => x.run },
    { id: "g3", nm: "今日の目標を 3日 達成", ic: "target", need: 3, v: (x) => x.daily },
    { id: "g7", nm: "今日の目標を 7日 達成", ic: "target", need: 7, v: (x) => x.daily },
    { id: "f20", nm: "はじめての正解 20問", ic: "check", need: 20, v: (x) => x.first },
    { id: "f60", nm: "はじめての正解 60問", ic: "check", need: 60, v: (x) => x.first },
    { id: "m10", nm: "今月 10問を習得", ic: "leaf", need: 10, v: (x) => x.mas },
    { id: "m30", nm: "今月 30問を習得", ic: "leaf", need: 30, v: (x) => x.mas },
    { id: "t1", nm: "単元マスター 1つ", ic: "atom", need: 1, v: (x) => x.topic },
    { id: "t3", nm: "単元マスター 3つ", ic: "atom", need: 3, v: (x) => x.topic },
    { id: "gm1", nm: "問題セットを完全習得", ic: "sets", need: 1, v: (x) => x.gm },
    { id: "gm3", nm: "問題セット 3つ 完全習得", ic: "sets", need: 3, v: (x) => x.gm },
    { id: "cf1", nm: "確認テストに合格", ic: "medal", need: 1, v: (x) => x.cf },
    { id: "cf3", nm: "確認テストに 3回 合格", ic: "medal", need: 3, v: (x) => x.cf },
    { id: "bk", nm: "模試の冊子で 60%以上", ic: "exam", need: 1, v: (x) => x.book },
    { id: "mx1", nm: "ランダム10問で 90%以上", ic: "shuffle", need: 1, v: (x) => x.mix },
    { id: "mx3", nm: "ランダム10問 90%以上 3回", ic: "shuffle", need: 3, v: (x) => x.mix },
    { id: "wp15", nm: "WP を 15 ためる", ic: "spark", need: 15, v: (x) => x.wp },
    { id: "mm3", nm: "メモを 3問に書く", ic: "memo", need: 3, v: (x) => x.memo },
    { id: "bm5", nm: "5問をブックマーク", ic: "bm", need: 5, v: (x) => x.bm },
  ];
  const MSI = {}; MS.forEach((m) => { MSI[m.id] = m; });
  /* 周期表の元素カード（マスの番号 → 原子番号・記号・族の色）。まん中は金（Au） */
  const EL = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca", "Sc", "Ti", "V", "Cr"];
  const CAT = { H: "k-nm", He: "k-ng", Li: "k-al", Be: "k-ae", B: "k-md", C: "k-nm", N: "k-nm", O: "k-nm", F: "k-ha", Ne: "k-ng", Na: "k-al", Mg: "k-ae", Al: "k-pt", Si: "k-md", P: "k-nm", S: "k-nm", Cl: "k-ha", Ar: "k-ng", K: "k-al", Ca: "k-ae", Sc: "k-tr", Ti: "k-tr", V: "k-tr", Cr: "k-tr" };
  function elOf(i) { if (i === 12) return { z: 79, s: "Au", c: "au" }; const k = i < 12 ? i : i - 1; return { z: k + 1, s: EL[k], c: CAT[EL[k]] }; }
  /* ライン（縦5・横5・斜め2） */
  const LINES = (() => {
    const L = [];
    for (let r = 0; r < 5; r++) L.push({ k: "r" + r, nm: "よこ" + (r + 1) + "列", c: [0, 1, 2, 3, 4].map((c) => r * 5 + c) });
    for (let c = 0; c < 5; c++) L.push({ k: "c" + c, nm: "たて" + (c + 1) + "列", c: [0, 1, 2, 3, 4].map((r) => r * 5 + c) });
    L.push({ k: "d0", nm: "ななめ（左上から）", c: [0, 6, 12, 18, 24], dg: 1 });
    L.push({ k: "d1", nm: "ななめ（右上から）", c: [4, 8, 12, 16, 20], dg: 1 });
    return L;
  })();
  function seedShuffle(arr, seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  /* その月のカード（25マス：まん中は "free"） */
  function cardOf(mk) {
    const pick = seedShuffle(MS.map((m) => m.id), "chem-bingo-" + mk).slice(0, 24);
    return pick.slice(0, 12).concat(["free"], pick.slice(12));
  }

  /* ══ いまの状態（開いたマス・そろったライン・受け取れるもの）══ */
  function state(mk) {
    mk = mk || monthKey();
    const cells = cardOf(mk), x = stat(mk), rw = M.get().rw || {};
    const cs = cells.map((id, i) => {
      if (id === "free") return { i, id, free: 1, on: 1, now: 1, need: 1 };
      const m = MSI[id]; let now = 0; try { now = m.v(x) || 0; } catch (e) {}
      const on = !!rw["bgo:" + mk + ":" + id] || now >= m.need;
      return { i, id, m, on: on ? 1 : 0, met: now >= m.need, mark: !!rw["bgo:" + mk + ":" + id], now: Math.min(now, m.need), need: m.need };
    });
    const lines = LINES.map((L) => ({ L, done: L.c.every((i) => cs[i].on), got: !!rw["bg:" + mk + ":L:" + L.k] }));
    const nDone = lines.filter((l) => l.done).length, nOpen = cs.filter((c) => c.on).length;
    const bon = [
      { k: "B:3", nm: "3ライン達成", need: 3, rw: RW.b3 },
      { k: "B:6", nm: "6ライン達成", need: 6, rw: RW.b6 },
      { k: "all", nm: "25マス コンプリート", need: 0, all: 1, rw: RW.all },
    ].map((b) => Object.assign(b, { done: b.all ? nOpen >= 25 : nDone >= b.need, got: !!rw["bg:" + mk + ":" + b.k] }));
    const claim = lines.filter((l) => l.done && !l.got).length + bon.filter((b) => b.done && !b.got).length;
    return { mk, cs, lines, bon, nDone, nOpen, claim };
  }
  /* 条件を満たしたマスに「開いた」印を付ける（無いときは書かない）。戻り値＝新しく開いたマスの番号 */
  function syncMarks(mk) {
    const st = state(mk), fresh = st.cs.filter((c) => !c.free && c.met && !c.mark);
    if (!fresh.length) return [];
    try { M.mut((s) => { s.rw = s.rw || {}; fresh.forEach((c) => { const k = "bgo:" + st.mk + ":" + c.id; if (!s.rw[k]) s.rw[k] = Date.now(); }); }); } catch (e) {}
    return fresh.map((c) => c.i);
  }

  /* ══ 受け取る ══ */
  let claiming = false;
  async function claim() {
    if (claiming) return;
    claiming = true;
    try {
      /* ほかの端末で受け取ったぶんを先に取りこむ（2台で同じラインを受け取らないように） */
      try { const XC = window.XevaCloud; if (navigator.onLine !== false && XC && XC.pullNow && (!XC.isLoggedIn || XC.isLoggedIn())) { await XC.pullNow(); M.reload(); } } catch (e) {}
      const mk = monthKey();
      syncMarks(mk);
      const st = state(mk);
      const todo = [];
      st.lines.forEach((l) => { if (l.done && !l.got) todo.push({ key: "L:" + l.L.k, nm: l.L.nm, rw: l.L.dg ? RW.diag : RW.line, dg: !!l.L.dg, cells: l.L.c }); });
      st.bon.forEach((b) => { if (b.done && !b.got) todo.push({ key: b.k, nm: b.nm, rw: b.rw, bonus: 1, all: !!b.all }); });
      if (!todo.length) { U.toast("そろっているラインはまだありません"); return; }
      /* 印を先に付けてから渡す（印が付かなかったら渡さない） */
      let marked = [];
      M.mut((s) => { s.rw = s.rw || {}; todo.forEach((t) => { const k = "bg:" + mk + ":" + t.key; if (!s.rw[k]) { s.rw[k] = Date.now(); marked.push(t); } }); });
      if (!marked.length) { open(); return; }
      let xeva = 0, gem = 0, tk = 0, cash = 0, half = 0;
      const why = "ビンゴ（" + mk.replace("-", "年") + "月・" + marked.map((t) => t.nm).join("・") + "）";
      marked.forEach((t) => {
        const r = t.rw;
        if (r.xeva) xeva += M.earn(r.xeva, "ビンゴ（" + t.nm + "）");
        if (r.gem) gem += r.gem;
        if (r.tk) tk += r.tk;
        try { if (r.cash && window.XEVA && XEVA.cashTicket) cash += XEVA.cashTicket.grantOnce("chembingo:" + mk + ":" + t.key, r.cash, "MagiChemLex " + why); } catch (e) {}
        try { if (r.half && window.XEVA && XEVA.halfTicket) half += XEVA.halfTicket.grantOnce("chembingo:" + mk + ":" + t.key, r.half, "MagiChemLex " + why); } catch (e) {}
      });
      try { M.takeEarned(); } catch (e) {}   /* 演習の結果のトーストに混ぜない */
      try { if (gem && window.XEVA && XEVA.gem) XEVA.gem.add(gem, "MagiChemLex " + why); } catch (e) {}
      try { if (tk && window.XEVA && XEVA.ticket) XEVA.ticket.add(tk, "MagiChemLex " + why); } catch (e) {}
      open(true);
      celebrate(marked, { xeva, gem, tk, cash, half });
      try { if (U.tab === "home") U.go("home", true); } catch (e) {}
    } finally { claiming = false; }
  }

  /* ══ 画面 ══ */
  const CSS = `
.bgb{position:relative;display:flex;align-items:center;gap:12px;width:100%;margin:12px 0 4px;padding:12px 14px;border-radius:20px;text-align:left;color:#fff;overflow:hidden;
  background:radial-gradient(120% 140% at 0% 0%,#3a2a8a 0%,#1b1846 55%,#0d0b26 100%);box-shadow:0 10px 26px rgba(20,10,70,.28),inset 0 0 0 1.5px rgba(255,214,110,.55);cursor:pointer;font:inherit}
.bgb::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(60deg,rgba(255,255,255,.04) 0 2px,transparent 2px 14px);pointer-events:none}
.bgb>*{position:relative}
.bgb-mini{flex:none;display:grid;grid-template-columns:repeat(5,8px);gap:2px;padding:5px;border-radius:10px;background:rgba(0,0,0,.28);box-shadow:inset 0 0 0 1px rgba(255,214,110,.35)}
.bgb-mini i{width:8px;height:8px;border-radius:2px;background:rgba(255,255,255,.16)}
.bgb-mini i.bon{background:linear-gradient(135deg,#fff3b8,#ffc93c);box-shadow:0 0 4px rgba(255,201,60,.8)}
.bgb-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.bgb-t small{font-size:.68rem;font-weight:900;letter-spacing:.14em;color:#ffd96a}
.bgb-t small i{font-style:normal;margin-left:6px;padding:0 7px;border-radius:99px;background:#ff4f86;color:#fff;letter-spacing:.04em}
.bgb-t b{font-size:1rem;font-weight:900;letter-spacing:.02em}
.bgb-t em{font-style:normal;font-size:.72rem;color:#d9d6ff}
.bgb-t em b{font-size:inherit;color:#ffd96a}
.bgb .di{width:20px;height:20px;flex:none;opacity:.85}
.bgb.bhas{animation:bgbGlow 1.8s ease-in-out infinite}
.bgb-bd{position:absolute;top:8px;right:38px;font-size:.68rem;font-weight:900;padding:2px 8px;border-radius:99px;color:#3a2600;background:linear-gradient(180deg,#fff3b8,#ffc93c);box-shadow:0 2px 8px rgba(255,201,60,.55)}
@keyframes bgbGlow{0%,100%{box-shadow:0 10px 26px rgba(20,10,70,.28),inset 0 0 0 1.5px rgba(255,214,110,.55)}50%{box-shadow:0 10px 30px rgba(255,180,40,.45),inset 0 0 0 2px #ffd96a}}

.mclbg{position:fixed;inset:0;z-index:70;display:flex;justify-content:center;align-items:flex-start;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;
  padding:calc(env(safe-area-inset-top,0px) + 14px) 10px calc(env(safe-area-inset-bottom,0px) + 22px);
  background:radial-gradient(120% 80% at 50% 0%,#2c2470 0%,#14113a 45%,#07061a 100%);opacity:0;transition:opacity .25s}
.mclbg.on{opacity:1}
.mclbg::before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.5;
  background:radial-gradient(1.5px 1.5px at 12% 20%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 78% 12%,#ffe9a8 50%,transparent 51%),radial-gradient(1px 1px at 40% 70%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 88% 64%,#cfe4ff 50%,transparent 51%),radial-gradient(1px 1px at 22% 86%,#ffe9a8 50%,transparent 51%),
  repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 34px),repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 1px,transparent 1px 34px)}
.bg-card{position:relative;width:100%;max-width:560px;color:#fff;border-radius:26px;padding:16px 14px 14px;
  background:linear-gradient(180deg,rgba(44,36,112,.92),rgba(19,16,58,.96));box-shadow:0 24px 60px rgba(0,0,0,.45),inset 0 0 0 1.5px rgba(255,214,110,.6),inset 0 0 0 5px rgba(20,14,60,.9),inset 0 0 0 6.5px rgba(255,214,110,.28)}
.bg-x{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:#fff;background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);z-index:3;border:0;cursor:pointer}
.bg-x .di{width:18px;height:18px}
.bg-hd{text-align:center;padding:2px 40px 10px}
.bg-hd small{display:block;font-size:.66rem;font-weight:900;letter-spacing:.42em;padding-left:.42em;color:#ffd96a}
.bg-hd h2{margin:2px 0 0;font-size:1.55rem;font-weight:900;letter-spacing:.06em;padding-left:.06em;line-height:1.15;
  background:linear-gradient(180deg,#fffbe8 0%,#ffe07a 45%,#e0a21c 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 0 rgba(0,0,0,.45))}
.bg-hd p{margin:4px 0 0;font-size:.74rem;color:#cfcaf8}
.bg-hd p b{color:#ffd96a}
.bg-board{position:relative;padding:8px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));box-shadow:inset 0 0 0 1px rgba(255,214,110,.3)}
.bg-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.bg-c{position:relative;aspect-ratio:1/1.08;border-radius:11px;padding:4px 4px 5px;display:flex;flex-direction:column;align-items:center;overflow:hidden;
  --cc:#64b5f6;background:linear-gradient(160deg,color-mix(in srgb,var(--cc) 34%,#1c1850),#15123d 85%);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--cc) 70%,transparent);cursor:pointer}
.bg-c.k-nm{--cc:#64b5f6}.bg-c.k-ng{--cc:#f06292}.bg-c.k-al{--cc:#ff8a65}.bg-c.k-ae{--cc:#ffb74d}.bg-c.k-md{--cc:#81c784}.bg-c.k-ha{--cc:#ba68c8}.bg-c.k-pt{--cc:#90a4ae}.bg-c.k-tr{--cc:#4dd0e1}
.bg-c .bz{position:absolute;left:5px;top:3px;font-size:.52rem;font-weight:900;color:color-mix(in srgb,var(--cc) 75%,#fff);opacity:.9}
.bg-c .bci{position:absolute;right:4px;top:3px;opacity:.55}
.bg-c .bci .di{width:11px;height:11px}
.bg-c .bsy{margin-top:7%;font-family:"Times New Roman",serif;font-size:clamp(15px,5.2vw,25px);font-weight:700;line-height:1;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.4)}
.bg-c .bnm{margin-top:auto;font-size:clamp(7.5px,2.1vw,10px);font-weight:800;line-height:1.2;text-align:center;color:#e9e6ff;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-all}
.bg-c .bpg{width:88%;height:3px;border-radius:99px;margin-top:3px;background:rgba(255,255,255,.14);overflow:hidden;flex:none}
.bg-c .bpg i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--cc),#fff)}
.bg-c.bon{--cc:#ffd25e;background:linear-gradient(150deg,#fff6cf 0%,#ffd75e 32%,#c8901a 62%,#ffe7a1 82%,#a37100 100%);box-shadow:inset 0 0 0 1.5px #fff3c4,0 0 14px rgba(255,200,60,.45)}
.bg-c.bon .bz,.bg-c.bon .bnm{color:#4a3000}.bg-c.bon .bsy{color:#3a2400;text-shadow:0 1px 0 rgba(255,255,255,.5)}
.bg-c.bon .bpg{display:none}
.bg-c.bon .bci{opacity:.0}
.bg-c .bst{position:absolute;right:-2px;top:-2px;width:36%;aspect-ratio:1;opacity:0;transform:rotate(-14deg) scale(1.6);pointer-events:none}
.bg-c.bon .bst{opacity:.92;transform:rotate(-14deg) scale(1)}
.bg-c.bpop .bst{animation:bgStamp .55s cubic-bezier(.2,1.6,.4,1) both}
.bg-c.bpop{animation:bgFlip .7s ease both}
.bg-c.bfr{--cc:#ffd25e;background:radial-gradient(120% 120% at 30% 20%,#fffbe8 0%,#ffe07a 40%,#d89a10 75%,#8a5e00 100%);box-shadow:inset 0 0 0 2px #fff3c4,0 0 22px rgba(255,200,60,.6)}
.bg-c.bfr .bsy{font-size:clamp(17px,6vw,29px);color:#3a2400;text-shadow:0 1px 0 rgba(255,255,255,.6)}
.bg-c.bfr .bnm{color:#4a3000;font-weight:900;letter-spacing:.16em}
.bg-c.bfr .bz{color:#6a4800}
.bg-c.bfr::after{content:"";position:absolute;inset:-40%;background:conic-gradient(from 0deg,transparent 0 40deg,rgba(255,255,255,.55) 60deg,transparent 80deg 360deg);animation:bgSpin 4s linear infinite;mix-blend-mode:overlay}
.bg-svg{position:absolute;inset:8px;width:calc(100% - 16px);height:calc(100% - 16px);pointer-events:none;overflow:visible}
.bg-svg line{stroke-linecap:round}
.bg-svg .bln{stroke:#fff3b0;stroke-width:5;filter:drop-shadow(0 0 6px #ffc93c) drop-shadow(0 0 2px #fff);opacity:.9}
.bg-svg .bln.bnew{stroke-dasharray:1000;stroke-dashoffset:1000;animation:bgDraw .9s .15s ease-out forwards,bgShim 1.4s 1.1s ease-in-out infinite}
.bg-svg .bln.bgot{opacity:.5;stroke-width:3.4}
.bg-stats{display:flex;justify-content:center;gap:8px;margin:10px 0 2px;flex-wrap:wrap}
.bg-stats span{font-size:.72rem;font-weight:900;padding:4px 10px;border-radius:99px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,214,110,.35);color:#f2efff}
.bg-stats b{color:#ffd96a;font-size:.86rem}
.bg-claim{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin:10px 0 4px;padding:13px 12px;border-radius:16px;border:0;font:inherit;font-weight:900;font-size:1rem;letter-spacing:.04em;cursor:pointer;
  color:#3a2600;background:linear-gradient(180deg,#fff3b8,#ffd25e 55%,#e0a21c);box-shadow:0 0 0 1.5px #fff6d0 inset,0 10px 26px rgba(255,180,40,.4)}
.bg-claim .di{width:20px;height:20px}
.bg-claim.bgo{animation:bgPulse 1.5s ease-in-out infinite}
.bg-claim:disabled{cursor:default;color:#cfcaf8;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)}
.bg-rw{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px;margin-top:10px}
.bg-rw div{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
.bg-rw div.bgot{opacity:.55}
.bg-rw div.bok{box-shadow:inset 0 0 0 1.5px #ffd25e;background:rgba(255,210,94,.14)}
.bg-rw b{font-size:.74rem;color:#ffd96a}
.bg-rw span{display:flex;align-items:center;flex-wrap:wrap;gap:4px;font-size:.72rem;font-weight:800;color:#f2efff}
.bg-rw span svg{display:inline-block;vertical-align:middle}
.bg-rw .ball{grid-column:1/-1;background:linear-gradient(90deg,rgba(255,210,94,.16),rgba(255,120,180,.12));box-shadow:inset 0 0 0 1.5px rgba(255,214,110,.55)}
.bg-note{margin:10px 2px 0;font-size:.7rem;line-height:1.6;color:#bdb8ea}
.bg-tip{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);transform:translateX(-50%);max-width:88vw;z-index:71;padding:8px 14px;border-radius:14px;font-size:.78rem;font-weight:800;color:#fff;
  background:rgba(14,12,40,.94);box-shadow:0 8px 22px rgba(0,0,0,.4),inset 0 0 0 1px rgba(255,214,110,.45);pointer-events:none;opacity:0;transition:opacity .2s}
.bg-tip.on{opacity:1}
/* BINGO! の演出 */
.bg-fx{position:fixed;inset:0;z-index:72;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;background:radial-gradient(circle at 50% 45%,rgba(60,40,150,.55),rgba(5,4,20,.88));cursor:pointer;animation:bgIn .25s ease both}
.bg-fx.out{animation:bgOut .3s ease forwards}
.bg-fx .bry{position:absolute;left:50%;top:45%;width:220vmax;height:220vmax;margin:-110vmax 0 0 -110vmax;pointer-events:none;
  background:repeating-conic-gradient(from 0deg,rgba(255,214,110,.16) 0deg 5deg,transparent 5deg 15deg);-webkit-mask:radial-gradient(closest-side,#000 6%,transparent 65%);mask:radial-gradient(closest-side,#000 6%,transparent 65%);animation:bgSpin 18s linear infinite}
.bg-fx h3{position:relative;margin:0;font-size:clamp(40px,min(17vw,19vh),108px);font-weight:900;letter-spacing:.04em;line-height:1;display:flex}
.bg-fx h3 span{display:inline-block;background:linear-gradient(180deg,#fffbe8 0%,#ffe07a 40%,#ff9a3c 75%,#ff4f86 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 4px 0 rgba(60,20,0,.55)) drop-shadow(0 0 18px rgba(255,190,60,.7));animation:bgLet .55s cubic-bezier(.2,1.6,.4,1) both}
.bg-fx .bsub{position:relative;font-size:.9rem;font-weight:900;color:#ffe9a8;letter-spacing:.08em;text-align:center;opacity:0;animation:bgUp .45s .55s ease both}
.bg-fx ul{position:relative;list-style:none;margin:0;padding:12px 16px;border-radius:18px;background:rgba(20,16,60,.88);box-shadow:inset 0 0 0 1.5px rgba(255,214,110,.6),0 12px 30px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:6px;min-width:min(320px,86vw);opacity:0;animation:bgUp .5s .75s ease both}
.bg-fx li{display:flex;align-items:center;gap:8px;font-weight:900;color:#fff;font-size:.95rem}
.bg-fx li .bk{width:30px;display:grid;place-items:center;flex:none}
.bg-fx li b{color:#ffd96a;margin-left:auto;font-size:1.05rem}
.bg-fx .btap{position:relative;font-size:.72rem;font-weight:800;color:rgba(255,255,255,.7);opacity:0;animation:bgUp .4s 1.3s ease both}
@keyframes bgStamp{0%{opacity:0;transform:rotate(-14deg) scale(2.4)}60%{opacity:1}100%{opacity:.92;transform:rotate(-14deg) scale(1)}}
@keyframes bgFlip{0%{transform:rotateY(90deg)}100%{transform:none}}
@keyframes bgSpin{to{transform:rotate(360deg)}}
@keyframes bgDraw{to{stroke-dashoffset:0}}
@keyframes bgShim{0%,100%{opacity:.95}50%{opacity:.55}}
@keyframes bgPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
@keyframes bgIn{from{opacity:0}}
@keyframes bgOut{to{opacity:0}}
@keyframes bgLet{0%{opacity:0;transform:translateY(-60%) scale(1.8) rotate(-12deg)}100%{opacity:1;transform:none}}
@keyframes bgUp{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:none}}
@media (max-height:520px){.bg-fx{gap:8px;padding:10px}.bg-fx ul{padding:8px 14px;gap:3px}.bg-fx li{font-size:.85rem}.bg-fx .bsub{font-size:.8rem}}
@media (prefers-reduced-motion:reduce){.bg-c.bfr::after,.bgb.bhas,.bg-claim.bgo,.bg-fx .bry{animation:none}}
`;
  function css() { if ($("#mclBgCss")) return; const st = document.createElement("style"); st.id = "mclBgCss"; st.textContent = CSS; document.head.appendChild(st); }
  const art = (fn, px) => (window[fn] ? window[fn](px) : "");
  function rwChips(r) {
    const out = [];
    if (r.xeva) out.push("<span>+" + (r.xeva * M.mult()).toLocaleString() + " XEVA</span>");
    if (r.tk) out.push("<span>" + art("XevaGachaTicketSVG", 13) + "ガチャチケット×" + r.tk + "</span>");
    if (r.gem) out.push("<span>💎×" + r.gem + "</span>");
    if (r.cash) out.push("<span>" + art("XevaCashTicketSVG", 13) + "両替チケット×" + r.cash + "</span>");
    if (r.half) out.push("<span>" + art("XevaHalfTicketSVG", 13) + "10連半額券×" + r.half + "</span>");
    return out.join("");
  }
  const STAMP = '<svg class="bst" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="rgba(178,34,52,.12)" stroke="#b22234" stroke-width="2.2"/>' +
    '<path d="M20 9.5l9.1 5.25v10.5L20 30.5l-9.1-5.25v-10.5Z" fill="none" stroke="#b22234" stroke-width="1.8"/><circle cx="20" cy="20" r="4.2" fill="none" stroke="#b22234" stroke-width="1.4"/>' +
    '<path d="M14.5 20.5l3.6 3.4 7.4-8" fill="none" stroke="#b22234" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function cellHTML(c, pop) {
    const e = elOf(c.i);
    if (c.free) return '<div class="bg-c bfr" data-i="' + c.i + '"><span class="bz">' + e.z + '</span><span class="bsy">' + e.s + '</span><span class="bnm">FREE</span></div>';
    const pct = c.need ? Math.min(100, Math.round(c.now / c.need * 100)) : 0;
    return '<div class="bg-c ' + e.c + (c.on ? " bon" : "") + (pop ? " bpop" : "") + '" data-i="' + c.i + '" title="' + esc(c.m.nm) + "（" + c.now + " / " + c.need + "）" + '">' +
      '<span class="bz">' + e.z + "</span>" + '<span class="bci">' + ic(c.m.ic) + "</span>" +
      '<span class="bsy">' + e.s + "</span>" + '<span class="bnm">' + esc(c.m.nm) + "</span>" +
      (c.on ? "" : '<span class="bpg"><i style="width:' + pct + '%"></i></span>') + STAMP + "</div>";
  }
  function svgHTML(st) {
    /* 5×5 のマスの中心（100×108 の座標・すき間ぶんは小さいので比で置く） */
    const cx = (i) => ((i % 5) + 0.5) * 20, cy = (i) => (Math.floor(i / 5) + 0.5) * 20;
    return '<svg class="bg-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      st.lines.filter((l) => l.done).map((l) => { const a = l.L.c[0], b = l.L.c[4]; const dx = (cx(b) - cx(a)) * 0.06, dy = (cy(b) - cy(a)) * 0.06;
        return '<line class="bln ' + (l.got ? "bgot" : "bnew") + '" x1="' + (cx(a) - dx).toFixed(2) + '" y1="' + (cy(a) - dy).toFixed(2) + '" x2="' + (cx(b) + dx).toFixed(2) + '" y2="' + (cy(b) + dy).toFixed(2) + '" vector-effect="non-scaling-stroke"/>'; }).join("") + "</svg>";
  }
  function pageHTML(st, pops) {
    const [y, m] = st.mk.split("-");
    const end = new Date(Number(y), Number(m), 1), left = Math.max(0, Math.ceil((end - Date.now()) / DAY));
    const rows = [
      { cls: "", nm: "よこ・たて 1列", r: RW.line },
      { cls: "", nm: "ななめ 1列", r: RW.diag },
      { cls: st.bon[0].got ? " bgot" : st.bon[0].done ? " bok" : "", nm: "3ライン達成", r: RW.b3 },
      { cls: st.bon[1].got ? " bgot" : st.bon[1].done ? " bok" : "", nm: "6ライン達成", r: RW.b6 },
      { cls: " ball" + (st.bon[2].got ? " bgot" : st.bon[2].done ? " bok" : ""), nm: "25マス コンプリート", r: RW.all },
    ];
    return '<div class="bg-card">' +
      '<button class="bg-x" data-a="bgClose" aria-label="閉じる">' + ic("x") + "</button>" +
      '<div class="bg-hd"><small>CHEMICAL BINGO</small><h2>ケミカル・ビンゴ</h2><p><b>' + Number(y) + "年" + Number(m) + "月</b>のカード・あと" + left + "日（毎月1日に新しくなります）</p></div>" +
      '<div class="bg-board"><div class="bg-grid">' + st.cs.map((c) => cellHTML(c, pops && pops.indexOf(c.i) >= 0)).join("") + "</div>" + svgHTML(st) + "</div>" +
      '<div class="bg-stats"><span>開いたマス <b>' + st.nOpen + "</b> / 25</span><span>ライン <b>" + st.nDone + "</b> / 12</span>" + (M.mult() > 1 ? "<span>💜 XEVA <b>" + M.mult() + "倍</b></span>" : "") + "</div>" +
      '<button class="bg-claim' + (st.claim ? " bgo" : "") + '" data-a="bgClaim"' + (st.claim ? "" : " disabled") + ">" + (st.claim ? ic("gift") + "そろった " + st.claim + " 件を受け取る" : "そろったラインはまだありません") + "</button>" +
      '<div class="bg-rw">' + rows.map((x) => '<div class="' + x.cls.trim() + '"><b>' + x.nm + "</b><span>" + rwChips(x.r) + "</span></div>").join("") + "</div>" +
      '<p class="bg-note">マスは条件を満たすと<b>自動でひらきます</b>（記録は XEVARION のアカウントで同期・ほかの端末で解いたぶんも数えます）。マスを押すと条件と進みぐあい。<br>' +
      "まん中の <b>Au（FREE）</b>は最初からひらいています。XEVA はほかのごほうびと同じく、イベント中は倍率がかかります。</p>" +
    "</div>";
  }
  let lastPop = [];
  function open(keep) {
    css();
    const mk = monthKey();
    const fresh = syncMarks(mk);
    const st = state(mk);
    let el = $("#mclBg");
    if (!el) { el = document.createElement("div"); el.id = "mclBg"; el.className = "mclbg"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "ビンゴカード"); document.body.appendChild(el); }
    const sy = keep ? el.scrollTop : 0;
    lastPop = fresh;
    el.innerHTML = pageHTML(st, fresh);
    el.hidden = false;
    if (keep) el.scrollTop = sy;
    requestAnimationFrame(() => el.classList.add("on"));
    document.body.classList.add("bg-open");
    if (fresh.length && !keep) { try { U.SFX.ok(); } catch (e) {} }
  }
  function close() {
    const el = $("#mclBg"); if (!el) return;
    el.classList.remove("on"); document.body.classList.remove("bg-open");
    setTimeout(() => { if (!el.classList.contains("on")) { el.hidden = true; el.innerHTML = ""; } }, 260);
    try { if (U.tab === "home") U.go("home", true); } catch (e) {}
  }
  function celebrate(marked, got) {
    const fx = document.createElement("div"); fx.className = "bg-fx";
    const nLines = marked.filter((t) => !t.bonus).length, all = marked.some((t) => t.all);
    const word = all ? "COMPLETE!" : "BINGO!";
    const li = [];
    if (got.xeva) li.push('<li><span class="bk"><img src="../XEVA.png" alt="" width="22" height="22"></span>XEVA<b>+' + got.xeva.toLocaleString() + "</b></li>");
    if (got.gem) li.push('<li><span class="bk">💎</span>ジェム<b>+' + got.gem + "</b></li>");
    if (got.tk) li.push('<li><span class="bk">' + art("XevaGachaTicketSVG", 18) + "</span>ガチャチケット<b>×" + got.tk + "</b></li>");
    if (got.cash) li.push('<li><span class="bk">' + art("XevaCashTicketSVG", 18) + "</span>両替チケット<b>×" + got.cash + "</b></li>");
    if (got.half) li.push('<li><span class="bk">' + art("XevaHalfTicketSVG", 18) + "</span>ガチャ10連半額券<b>×" + got.half + "</b></li>");
    fx.innerHTML = '<div class="bry"></div><h3>' + Array.from(word).map((ch, i) => '<span style="animation-delay:' + (i * 0.06).toFixed(2) + 's">' + ch + "</span>").join("") + "</h3>" +
      '<div class="bsub">' + esc(marked.map((t) => t.nm).join("・")) + (nLines > 1 ? "（" + nLines + "ライン）" : "") + "</div>" +
      (li.length ? "<ul>" + li.join("") + "</ul>" : "") + '<div class="btap">タップで閉じる</div>';
    document.body.appendChild(fx);
    try { U.SFX.done(); } catch (e) {}
    try { U.confetti(all ? 90 : 60); setTimeout(() => U.confetti(40, innerWidth * 0.25, innerHeight * 0.3), 350); setTimeout(() => U.confetti(40, innerWidth * 0.75, innerHeight * 0.3), 650); } catch (e) {}
    const done = () => { fx.classList.add("out"); setTimeout(() => fx.remove(), 300); };
    fx.addEventListener("click", done);
    setTimeout(() => { if (fx.isConnected) done(); }, 7000);
  }
  let tipT = 0;
  function tip(i) {
    const st = state(), c = st.cs[i]; if (!c) return;
    let t = $("#bgTip"); if (!t) { t = document.createElement("div"); t.id = "bgTip"; t.className = "bg-tip"; document.body.appendChild(t); }
    t.innerHTML = c.free ? "まん中は <b>FREE</b>（最初からひらいています）" : esc(c.m.nm) + "：<b>" + c.now + " / " + c.need + "</b>" + (c.on ? "　✅ ひらきました" : "");
    t.classList.add("on"); clearTimeout(tipT); tipT = setTimeout(() => t.classList.remove("on"), 2200);
  }

  /* ══ ホームの入口 ══ */
  function bannerHTML() {
    let st = null; try { syncMarks(); st = state(); } catch (e) { return ""; }
    css();
    const m = Number(st.mk.slice(5, 7));
    return '<button class="bgb' + (st.claim ? " bhas" : "") + '" data-a="bgOpen">' +
      '<span class="bgb-mini" aria-hidden="true">' + st.cs.map((c) => "<i" + (c.on ? ' class="bon"' : "") + "></i>").join("") + "</span>" +
      '<span class="bgb-t"><small>CHEMICAL BINGO' + (st.nOpen <= 1 ? "<i>NEW</i>" : "") + "</small><b>ビンゴカード（" + m + "月）</b><em>開いたマス <b>" + st.nOpen + "</b>/25・ライン <b>" + st.nDone + "</b>/12・コンプリートで 12,000 XEVA</em></span>" +
      (st.claim ? '<span class="bgb-bd">受け取れる ' + st.claim + "</span>" : "") + ic("chevR") + "</button>";
  }

  const A = U.act;
  A.bgOpen = () => open();
  A.bgClose = () => close();
  A.bgClaim = () => { claim(); };
  document.addEventListener("click", (e) => { const c = e.target.closest("#mclBg .bg-c"); if (c) tip(Number(c.dataset.i)); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("bg-open") && !U.sheetOpen()) { const fx = $(".bg-fx"); if (fx) fx.click(); else close(); } });
  window.addEventListener("xeva:synced", () => { if (document.body.classList.contains("bg-open") && !claiming) open(true); });

  window.MCLBingo = { open, close, bannerHTML, state, stat, MS, RW, _fx: celebrate };   /* _fx＝演出だけ（確かめる用・記録もごほうびも動かない） */
  /* 読みこみの順番で、ホームがこのファイルより先に描かれていたら描き直す（入口を出す） */
  if (document.readyState !== "loading" && U.tab === "home" && !document.querySelector(".bgb")) { try { U.go("home", true); } catch (e) {} }
})();
