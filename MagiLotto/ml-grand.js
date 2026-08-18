/* ============================================================
   Magi Lotto — MAGI GRAND DRAW（半月に一度のお祭り）
   ------------------------------------------------------------
   ★ 名前は必ず「MAGI GRAND DRAW」。Jackpot とは呼ばない。
   ★ 結果発表は<b>毎月1日と16日の2回だけ</b>（年24回）。
     受付はいつでもできて、次の発表日にまとめて結果が出る。
   ★ ひとりでも成立させるための決めごと（ここが本作でいちばん大事）
       ・参加人数が何人でも、発表日が来れば<b>必ず</b>結果が出る。
       ・他の人と賞金を取り合わない。あなたの当たりやすさは常に同じ。
       ・1等は<b>賞金プール全額</b>で、足りなければ運営が最低保証まで足す。
         → 「人が少ないから賞金が寂しい」が起きない。
   ★ 発表日の演出は、ふだんの抽選とはっきり変える。
       暗転 → カウントダウン → ボールが1つずつ → MAGIボール → 等級 → 賞金カウントアップ
   ============================================================ */
(function () {
  "use strict";
  const ML = window.ML;
  const $ = ML.$, fmt = ML.fmt, esc = ML.esc;

  let pick = [];
  let busy = false;

  /* ══════════════════════════════════════════════════════════
     受付の画面
     ══════════════════════════════════════════════════════════ */
  function open() {
    const S = ML.state();
    if (!pick.length && Array.isArray(S.lastGrand)) pick = S.lastGrand.slice();
    const c = ML.cfg().grand, gi = ML.grandInfo();
    const mine = S.entries[gi.nextId] || [];
    const el = $("#mlGrand"); if (!el) return;
    el.innerHTML =
      '<div class="ml-ghead" style="--c:' + ML.GAMES.grand.c + '">' +
        '<button class="b" onclick="mlGo(\'home\')" aria-label="ホームへもどる">‹</button>' +
        '<span class="t"><span class="en" style="font-size:14px">MAGI GRAND DRAW</span>' +
        '<span class="ja">マギグランドドロー — 半月に一度のお祭り</span></span>' +
        '<button class="q" onclick="mlGrHelp()" aria-label="あそびかた">?</button></div>' +

      '<div class="ml-grand" style="pointer-events:none">' +
        '<img class="bn" src="img/banner_home.webp" alt=""><span class="ov"></span>' +
        '<div class="in">' +
          '<div class="ttl">NEXT GRAND DRAW</div>' +
          '<div class="sub">結果発表は 毎月 1日 と 16日</div>' +
          '<div class="box"><div class="lb">次回 結果発表</div><div class="day">' + esc(gi.nextText) + "</div>" +
            '<div class="ml-cd"><div><b>' + gi.d + "</b><i>日</i></div><div><b>" + gi.h + "</b><i>時間</i></div><div><b>" + gi.m + "</b><i>分</i></div></div>" +
            '<div class="ml-pool"><div class="lb2">現在の賞金総額</div><div class="amt" id="mlGrPool">' + fmt(ML.pool()) + "</div>" +
            '<div class="cur">XEVA</div></div>' +
          "</div>" +
        "</div>" +
      "</div>" +

      '<div class="ml-card c" style="--c:' + ML.GAMES.grand.c + '">' +
        '<div class="ml-note" style="text-align:center">1〜' + c.range + " から <b>" + c.pick + "個</b>えらんでください</div>" +
        '<div class="ml-chips" id="mlGrChips"></div>' +
        '<div class="ml-board" id="mlGrBoard"></div>' +
        '<button class="ml-pick" style="border-color:rgba(185,139,255,.5);background:linear-gradient(180deg,rgba(185,139,255,.2),rgba(185,139,255,.06));color:#dcc6ff" onclick="mlGrMagi()">✦ MAGI PICK（おまかせ）</button>' +
        '<button class="ml-pick" style="margin-top:6px;border-color:var(--line);background:rgba(255,255,255,.06);color:var(--sub)" onclick="mlGrClear()">ぜんぶ消す</button>' +
      "</div>" +

      (mine.length ? '<div class="ml-card"><div class="ml-h" style="margin:0 0 6px">' + esc(gi.nextText) + ' の回に参加中 <small>' + mine.length + "口</small></div>" +
        mine.map((e, i) => '<div class="ml-kv"><span>' + (i + 1) + '口目</span><span style="letter-spacing:.08em">' + e.nums.join(" ") + "</span></div>").join("") +
        '<div class="ml-note" style="margin-top:8px">発表日（' + esc(gi.nextText) + "）に、この画面を開くと結果が出ます。" +
        "アプリを開かないまま過ぎても、次に開いたときに<b>必ず精算されます</b>。</div></div>" : "") +

      '<div class="ml-card" id="mlGrPay"></div>' +
      pastHTML();
    board();
    chips();
    payTable();
    bar();
  }

  function board(win, magi) {
    const c = ML.cfg().grand, b = $("#mlGrBoard"); if (!b) return;
    let h = "";
    for (let i = 1; i <= c.range; i++) {
      const on = pick.indexOf(i) >= 0;
      const hit = win && win.indexOf(i) >= 0 && on;
      h += '<button class="ml-bn ' + (hit ? "hit" : on ? "on" : "") + '" data-n="' + i + '"' +
        (magi === i ? ' style="outline:2px solid #b98bff"' : "") + ">" + i + "</button>";
    }
    b.innerHTML = h;
    b.querySelectorAll("[data-n]").forEach((x) => { x.onclick = () => tap(+x.getAttribute("data-n")); });
  }
  function tap(n) {
    if (busy) return;
    const c = ML.cfg().grand;
    const i = pick.indexOf(n);
    if (i >= 0) pick.splice(i, 1);
    else if (pick.length < c.pick) pick.push(n);
    else { ML.toast(c.pick + "個までです（外したい数字をもう一度押してください）"); return; }
    pick.sort((a, b2) => a - b2);
    ML.sfx("tap"); board(); chips(); bar();
  }
  function chips() {
    const c = ML.cfg().grand, el = $("#mlGrChips"); if (!el) return;
    let h = "";
    for (let i = 0; i < c.pick; i++) {
      const v = pick[i];
      h += '<span class="ml-chip ' + (v == null ? "empty" : "") + '">' + (v == null ? "–" : v) + "</span>";
    }
    el.innerHTML = h;
  }
  function payTable() {
    const box = $("#mlGrPay"); if (!box) return;
    const c = ML.cfg().grand, r = ML.rtpGrand(ML.poolRaw());
    const stake = c.price;
    box.innerHTML = '<div class="ml-h" style="margin:0 0 6px">当選と賞金</div>' +
      '<div class="ml-pay"><span class="h">等級</span><span class="h m">賞金</span><span class="h p">確率</span>' +
      r.rows.map((x) => "<span>" + esc(x.nm) + "</span><span class='m'>" +
        (x.jackpot ? "<b style='color:var(--gold)'>" + fmt(x.amount) + " XEVA</b>" : "×" + fmt(x.mul) +
          "<br><i style='font-size:9px;color:var(--sub);font-style:normal'>" + fmt(Math.round(stake * x.mul)) + " XEVA</i>") +
        "</span><span class='p'>" + ML.odds(x.prob) + "</span>").join("") +
      "</div>" +
      '<div class="ml-note" style="margin-top:8px">' +
        "2〜5等だけで見た還元率 <b>" + ML.pct(r.base, 1) + "</b>　／　当たる確率 <b>" + ML.pct(r.hit, 1) + "</b><br>" +
        "1等の原資は<b>運営が用意しています</b>（最低保証 <b>" + fmt(c.minGuarantee) + " XEVA</b>）。" +
        "そのぶんは還元率に<b>上乗せ</b>されます（いまの見込み <b>" + ML.pct(r.rtp, 1) + "</b>）。<br>" +
        "賞金プールは購入額の一部と運営の積み増しで<b>毎日ふくらみます</b>。" +
        "1等が出るとプールは 0 に戻り、そこからまた育っていきます。" +
      "</div>";
  }
  /* 買うバー。支払いは XEVA だけ（2026-08-13〜）。
     ★ 「XEVA が足りない」ときはボタンを押せるままにして、増やし方を案内する。 */
  function bar() {
    const c = ML.cfg().grand;
    const full = pick.length === c.pick;
    const bb = $("#mlBuy"); if (!bb) return;
    const poor = !ML.canPay(c.price);
    const off = !full || busy;
    bb.style.setProperty("--c", ML.GAMES.grand.c);
    bb.innerHTML =
      '<button class="ml-bbtn ' + (poor ? "poor" : "") + '" id="mlGrBuy" ' + (off ? "disabled" : "") + "><b>" +
        (full ? "この" + c.pick + "個で1口 買う" : "あと" + (c.pick - pick.length) + "個えらぶ") +
      "</b><small>" + (busy ? "抽選を受付中…" : !full ? "数字をえらんでください"
        : poor ? "XEVA が足りません" : ML.priceText(c.price)) + "</small></button>";
    const btn = bb.querySelector("#mlGrBuy");
    if (btn && !off) btn.onclick = poor ? () => ML.games.poorSheet(c.price) : buy;
  }
  window.mlGrMagi = function () {
    if (busy) return;
    const c = ML.cfg().grand;
    const bag = []; for (let i = 1; i <= c.range; i++) bag.push(i);
    const a = new Uint32Array(c.pick); crypto.getRandomValues(a);
    pick = [];
    for (let i = 0; i < c.pick; i++) pick.push(bag.splice(a[i] % bag.length, 1)[0]);
    pick.sort((x, y) => x - y);
    ML.sfx("tap"); board(); chips(); bar();
    ML.toast("✦ MAGI PICK：<b>" + pick.join(" ") + "</b>", 2000);
  };
  window.mlGrClear = function () { if (busy) return; pick = []; ML.sfx("tap"); board(); chips(); bar(); };

  async function buy() {
    const c = ML.cfg().grand;
    busy = true; bar();
    const r = await ML.draw.buyGrand(pick.slice());
    busy = false;
    if (!r.ok) { bar(); ML.toast("残高が足りません"); return; }
    ML.paintWal();
    const gi = ML.grandInfo();
    ML.sfx("mid");
    ML.toast("🎫 <b>" + pick.join(" ") + "</b> で1口 受け付けました<br>" +
      "<span style='font-size:10px;color:var(--sub)'>結果発表は " + esc(gi.nextText) + "</span>", 3000);
    open();
  }

  /* ══════════════════════════════════════════════════════════
     過去の回（結果を見返す）
     ══════════════════════════════════════════════════════════ */
  function pastHTML() {
    const S = ML.state();
    const keys = Object.keys(S.grandSeen || {}).sort().reverse().slice(0, 6);
    if (!keys.length) return "";
    return '<div class="ml-card"><div class="ml-h" style="margin:0 0 6px">これまでの結果</div>' +
      keys.map((k) => {
        const g = S.grandSeen[k];
        const hit = g.rows && g.rows.some((r) => r.rank);
        return '<div class="ml-kv"><span>' + esc(k) + "　<i style='font-style:normal;color:var(--sub)'>" +
          (g.draw ? g.draw.main.join(" ") + " ＋ " + g.draw.magi : "—") + "</i></span>" +
          "<span style='color:" + (g.total > 0 ? "var(--gold)" : "var(--sub)") + "'>" +
          (g.total > 0 ? "+" + fmt(g.total) : g.already && hit ? "別の端末で受取済み" : "はずれ") + "</span></div>";
      }).join("") + "</div>";
  }

  /* ══════════════════════════════════════════════════════════
     結果発表の演出（ふだんの抽選とはっきり変える）
     ══════════════════════════════════════════════════════════ */
  async function showResults(list) {
    for (const res of list) {
      if (res.already) continue;             // 別の端末ですでに精算済み
      await showOne(res);
    }
    ML.paintWal();
    ML.paintHome();
  }

  async function showOne(res) {
    const ov = $("#mlGrandShow"), body = $("#mlGrandShowBody");
    if (!ov || !body) return;
    const c = ML.cfg().grand;
    const best = res.rows.reduce((a, b) => (b.rank && (!a.rank || b.rank < a.rank) ? b : a), { rank: 0 });
    ov.classList.add("on");

    /* ① 幕開け */
    body.innerHTML =
      '<div class="ml-gshd">MAGI GRAND DRAW</div>' +
      '<div class="ml-gsday">' + esc(res.pid) + " の結果発表</div>" +
      '<div class="ml-gscount" id="mlGsCount">3</div>';
    ML.sfx("tease");
    for (const n of ["3", "2", "1"]) {
      $("#mlGsCount").textContent = n;
      $("#mlGsCount").style.animation = "none"; void $("#mlGsCount").offsetWidth;
      $("#mlGsCount").style.animation = "mlPop .5s cubic-bezier(.2,1.5,.4,1) both";
      ML.sfx("tap");
      await wait(720);
    }

    /* ② 抽選機が現れ、そこからメインの3球 → MAGIボールが出てくる
       ★ 抽選機の絵はここでしか出さない。1日と16日だけの「特別な絵」にしておく。 */
    body.innerHTML =
      '<div class="ml-gshd">MAGI GRAND DRAW</div>' +
      '<div class="ml-gsday">' + esc(res.pid) + "</div>" +
      '<img class="ml-gsmach" src="img/machine.webp" alt="">' +
      '<div class="ml-drawlb" style="margin-top:10px">当せん番号</div>' +
      '<div class="ml-balls" id="mlGsBalls"></div>' +
      '<div class="ml-drawlb" style="margin-top:12px">MAGI BALL</div>' +
      '<div class="ml-balls" id="mlGsMagi"></div>';
    await wait(520);      /* 抽選機が出てくるのを見せてから、球を出しはじめる */
    const mineSet = {};
    res.rows.forEach((r) => r.nums.forEach((n) => { mineSet[n] = true; }));
    const bb = $("#mlGsBalls");
    for (const n of res.draw.main) {
      const el = document.createElement("span");
      el.className = "ml-ball " + (mineSet[n] ? "hit" : "");
      el.textContent = n;
      bb.appendChild(el);
      ML.sfx(mineSet[n] ? "reveal" : "ball");
      await wait(760);
    }
    await wait(400);
    const mb = $("#mlGsMagi");
    const mel = document.createElement("span");
    mel.className = "ml-ball magi";
    mel.textContent = res.draw.magi;
    mb.appendChild(mel);
    ML.sfx("mid");
    await wait(900);

    /* ③ 自分の口ごとの結果 */
    body.innerHTML =
      '<div class="ml-gshd">RESULT</div>' +
      '<div class="ml-gsday">' + esc(res.pid) + "　当せん番号 <b>" + res.draw.main.join(" ") + "</b> ＋ <b>" + res.draw.magi + "</b></div>" +
      '<div class="ml-gsrows">' + res.rows.map((r) => {
        const chips = r.nums.map((n) => '<span class="ml-chip ' +
          (res.draw.main.indexOf(n) >= 0 ? "hit" : n === res.draw.magi ? "magi" : "") + '">' + n + "</span>").join("");
        return '<div class="ml-gsrow"><span class="c">' + chips + "</span>" +
          '<span class="r ' + (r.win > 0 ? "win" : "") + '">' + (r.rank ? esc(r.nm) : "はずれ") +
          (r.win > 0 ? "<b>+" + fmt(r.win) + "</b>" : "") + "</span></div>";
      }).join("") + "</div>" +
      '<div class="ml-gstot">合計 <b>' + fmt(res.total) + "</b> XEVA</div>" +
      '<button class="ml-wok" id="mlGsOk" style="margin-top:16px">OK</button>';
    await new Promise((r) => { $("#mlGsOk").onclick = r; });
    ov.classList.remove("on");

    /* ④ 大当たりならフル演出（1等は最上級） */
    if (res.jackpot > 0) {
      await ML.celebrate({
        tier: "ultra", title: "MAGI GRAND DRAW 1等", sub: "賞金プール全額", amount: res.jackpot,
        lines: "おめでとうございます。<b>" + c.pick + "個すべて</b>が一致しました。<br>" +
          "賞金プールはここから 0 に戻り、次の回に向けてまた育っていきます。",
      });
    } else if (res.total > 0) {
      const mul = res.rows.reduce((a, b) => Math.max(a, b.mul || 0), 0);
      await ML.celebrate({
        tier: ML.tierOf(mul), title: best.rank ? best.rank + "等 当選" : "当選", sub: best.nm || "",
        amount: res.total, mul: mul || null,
        lines: res.n + "口ぶんの合計です。次回は <b>" + esc(ML.grandInfo().nextText) + "</b>。",
      });
    }
  }
  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function repaintPool() {
    const a = $("#mlGrPool"); if (a) a.textContent = fmt(ML.pool());
  }

  window.mlGrHelp = function () {
    const c = ML.cfg().grand, r = ML.rtpGrand(ML.poolRaw());
    ML.sheet({
      icon: "👑", title: "MAGI GRAND DRAW とは",
      html: "<b>半月に一度のお祭り</b>です。結果発表は<b>毎月1日と16日</b>の2回だけ（年24回）。<br><br>" +
        "1〜" + c.range + " から <b>" + c.pick + "個</b>えらんで口を買い、発表日を待ちます。<br>" +
        "抽選では<b>メイン" + c.pick + "個</b>と<b>MAGIボール1個</b>が出ます。<br><br>" +
        "・<b>1等（" + c.pick + "個一致）</b>＝<b>賞金プール全額</b>（" + ML.odds(r.rows[0].prob) + "）<br>" +
        "・2等＝" + (c.pick - 1) + "個＋MAGIボール ×" + fmt(c.mul.r2) + "<br>" +
        "・3等＝" + (c.pick - 1) + "個一致 ×" + fmt(c.mul.r3) + "<br>" +
        "・4等＝" + (c.pick - 2) + "個＋MAGIボール ×" + fmt(c.mul.r4) + "<br>" +
        "・5等＝" + (c.pick - 2) + "個一致 ×" + fmt(c.mul.r5) + "<br><br>" +
        "<b>人数は関係ありません。</b>参加者が何人でも、発表日が来れば必ず結果が出ます。" +
        "他の人と賞金を取り合うこともありません。1等の原資は運営が用意していて、" +
        "プールが足りなくても<b>最低 " + fmt(c.minGuarantee) + " XEVA</b> は必ずお渡しします。<br><br>" +
        "当せん番号は<b>サーバーに1度だけ書かれ、以後は誰が見ても同じ</b>です。" +
        "あとから運営が変えることもできません。",
    });
  };

  ML.grand = { open, showResults, repaintPool };
})();
