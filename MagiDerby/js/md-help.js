/* ============================================================
   MagiDerby — 使い方と馬券の説明（★★ 2026-10-26 ご指定「馬券の種類などの説明を見られるように。使い方をアニメーションで」）
   ------------------------------------------------------------
   ・MD_HELP.open("howto" | "types" | "rules")。画面の上の「？」・馬券を買う画面の「？ 馬券の種類」から開く。
   ・使い方＝スマホの画面の絵の上を指が動いて、①レースを選ぶ → ②券種 → ③馬 → ④金額（足していく）→ ⑤購入 → ⑥結果の確認 を順に見せる
     （1場面 4〜5秒・自動で次へ。もどる／すすむ／もう一度）。動きを減らす設定では指を動かさず、場面だけ切りかえる。
   ・見た目は md.css の .mdh-*。数字（締切・1点の額など）は md-data.js の値を使う。
   ============================================================ */
(function () {
  "use strict";
  const D = window.MD_DATA;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("ja-JP");
  const RM = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  const LIVE_URL = "https://www.jra.go.jp/tvradio/racelive/";

  /* ══════════ 使い方（アニメ）の場面 ══════════
     k … 指が押す部品（data-k）。act … 押したときの変化（その場面の関数で） */
  const SCENES = [
    { cap: "① 発売中のレースの<b>「馬券を買う」</b>を押します",
      sub: "発売はレースの<b>" + (D.SALE_DAYS_BEFORE || 3) + "日前の 0:00</b> から。締切は発走の<b>" + D.CLOSE_BEFORE / 60 + "分前</b>（サーバーの時刻）",
      html: '<div class="mk-hd"><b>MagiDerby</b><i>G1 レース</i></div>' +
        '<div class="mk-sale" data-k="sale"><span><b>天皇賞・秋 発売中！</b><small>締切 15:38・あと 2日 06:12</small></span><em>馬券を買う ›</em></div>' +
        '<div class="mk-hero"><span class="g1">G1</span><b>天皇賞（秋）</b><small>東京 芝2000m</small><div class="mk-cd"><small>締切まで</small><b>2日 06:12:30</b></div></div>',
      steps: [["sale", 1300]] },
    { cap: "② <b>券種</b>をえらびます",
      sub: "単勝・複勝・馬連・ワイド・馬単・3連複・3連単など。ちがいは「馬券の種類」に",
      html: '<div class="mk-hd2"><b>馬券を買う</b><i>天皇賞・秋</i></div><div class="mk-types">' +
        ["単勝", "複勝", "枠連", "馬連", "ワイド", "馬単", "3連複", "3連単"].map((t, i) => '<i data-k="ty' + i + '"' + (i === 0 ? ' class="on"' : "") + ">" + t + "</i>").join("") + "</div>" +
        '<p class="mk-desc" data-k="desc">1着になる馬を当てる</p>',
      steps: [["ty3", 1200, (sc) => { sc.querySelectorAll(".mk-types i").forEach((x, i) => x.classList.toggle("on", i === 3)); sc.querySelector('[data-k="desc"]').textContent = "1着と2着の馬番の組み合わせ（順不同）"; }]] },
    { cap: "③ <b>馬</b>をえらびます",
      sub: "ボックス・ながし・フォーメーションで、まとめて買うこともできます",
      html: '<div class="mk-hd2"><b>馬連・通常</b><i>1頭目 → 2頭目</i></div><div class="mk-grid">' +
        [["1", "#f7f7f2", "#1b1b1b"], ["2", "#1f1f24", "#fff"], ["3", "#e23b34", "#fff"], ["4", "#2b6fd6", "#fff"], ["5", "#f2cf1d", "#1b1b1b"], ["6", "#2c9d4c", "#fff"], ["7", "#f08a24", "#1b1b1b"], ["8", "#f07ab0", "#1b1b1b"]]
          .map((h) => '<span data-k="h' + h[0] + '"><b style="background:' + h[1] + ";color:" + h[2] + '">' + h[0] + "</b><small>" + ["サンプルA", "サンプルB", "サンプルC", "サンプルD", "サンプルE", "サンプルF", "サンプルG", "サンプルH"][Number(h[0]) - 1] + "</small></span>").join("") +
        '</div><div class="mk-pts" data-k="pts">0点</div>',
      steps: [["h3", 1100, (sc) => { sc.querySelector('[data-k="h3"]').classList.add("on"); }], ["h7", 1100, (sc) => { sc.querySelector('[data-k="h7"]').classList.add("on"); sc.querySelector('[data-k="pts"]').textContent = "1点（3-7）"; }]] },
    { cap: "④ <b>金額のボタンを押すと足されます</b>",
      sub: "「リセット」で 0 に。決まったら「買い目に追加」（1点 " + fmt(D.UNIT) + " XEVA から）",
      html: '<div class="mk-hd2"><b>金額</b><i>1点あたり</i></div><div class="mk-amt"><b data-k="amt">100</b><small>XEVA/点</small></div>' +
        '<div class="mk-q"><i data-k="q1">＋100</i><i data-k="q5">＋500</i><i data-k="q10">＋1,000</i><i data-k="q50">＋5,000</i><i class="rs" data-k="rs">リセット</i></div>' +
        '<div class="mk-add" data-k="add">買い目に追加（100 XEVA）</div><div class="mk-line" data-k="line" hidden>馬連 3-7 ・ 1点×1,600</div>',
      steps: [["q5", 1000, (sc) => setAmt(sc, 600)], ["q10", 1000, (sc) => setAmt(sc, 1600)], ["add", 1100, (sc) => { sc.querySelector('[data-k="line"]').hidden = false; }]] },
    { cap: "⑤ <b>「購入する」を2回</b>押すと購入",
      sub: "1回目で確認の表示になり、2回目で買えます（XEVA を使います）",
      html: '<div class="mk-hd2"><b>買い目</b><i>1件</i></div><div class="mk-line">馬連 3-7 ・ 1点×1,600</div>' +
        '<div class="mk-tot"><small>合計</small><b>1,600 XEVA</b></div><div class="mk-buy" data-k="buy">購入する</div><div class="mk-toast" data-k="toast" hidden>🎫 購入しました：1件・1,600 XEVA</div>',
      steps: [["buy", 1100, (sc) => { const b = sc.querySelector('[data-k="buy"]'); b.textContent = "もう一度押すと購入（1,600 XEVA）"; b.classList.add("arm"); }], ["buy", 1200, (sc) => { sc.querySelector('[data-k="toast"]').hidden = false; }]] },
    { cap: "⑥ 結果が届いたら、<b>「馬券」タブで券を押して確認</b>",
      sub: "確認したときに払い戻し。結果は<b>この端末がデータを受け取りしだい</b>（反映の時刻は前後します）",
      html: '<div class="mk-tabs"><i>G1 レース</i><i class="on">馬券<em>1</em></i><i>データ</i></div>' +
        '<div class="mk-tk" data-k="tk"><div class="mk-tk-l"><small>2026年4回8日</small><b>東京</b><span>11 レース</span><small>天皇賞・秋</small></div><i class="mk-band"></i>' +
        '<div class="mk-tk-ty">馬<br>連</div><div class="mk-tk-r"><span><i>3</i>−<i>7</i></span><b>☆1,600<small>XEVA</small></b></div>' +
        '<div class="mk-rdy" data-k="rdy">結果が出ました！ タップして確認</div><div class="mk-stamp" data-k="stamp" hidden><b>的中</b><small>12,480</small></div></div>' +
        '<div class="mk-win" data-k="win" hidden>🎯 的中！ ＋12,480 XEVA</div>',
      steps: [["tk", 1300, (sc) => { sc.querySelector('[data-k="rdy"]').hidden = true; sc.querySelector('[data-k="stamp"]').hidden = false; sc.querySelector('[data-k="win"]').hidden = false; }]] },
  ];
  function setAmt(sc, v) {
    sc.querySelector('[data-k="amt"]').textContent = fmt(v);
    sc.querySelector('[data-k="add"]').textContent = "買い目に追加（" + fmt(v) + " XEVA）";
  }

  /* ══════════ 馬券の種類 ══════════ */
  const TYPES = [
    { nm: "単勝", en: "WIN", lv: 1, d: "<b>1着</b>になる馬を当てる", ex: "⑥ を買う → ⑥ が1着なら的中", pt: "1頭＝1点" },
    { nm: "複勝", en: "PLACE", lv: 0, d: "<b>3着まで</b>に入る馬を当てる（出走が7頭以下は2着まで）", ex: "⑥ を買う → ⑥ が1〜3着なら的中", pt: "1頭＝1点・いちばん当たりやすい" },
    { nm: "枠連", en: "BRACKET", lv: 2, d: "1着と2着の<b>枠番</b>の組み合わせ（順番は問わない）", ex: "3枠−5枠 → 1・2着が3枠と5枠の馬なら的中（同じ枠どうしの「ゾロ目」もある）", pt: "枠順の発表前は買えません" },
    { nm: "馬連", en: "QUINELLA", lv: 2, d: "1着と2着の<b>馬番</b>の組み合わせ（順番は問わない）", ex: "3−7 → ③と⑦が1・2着なら、どちらが1着でも的中", pt: "2頭の組み合わせ1つ＝1点" },
    { nm: "ワイド", en: "WIDE", lv: 1, d: "<b>3着まで</b>に入る2頭の組み合わせ（順番は問わない）", ex: "3−7 → ③と⑦がどちらも3着までなら的中", pt: "当たりやすいぶん配当は控えめ" },
    { nm: "馬単", en: "EXACTA", lv: 3, d: "1着と2着を<b>着順どおり</b>に当てる", ex: "3→7 → ③が1着・⑦が2着のときだけ的中", pt: "馬連より難しく、配当は高め" },
    { nm: "3連複", en: "TRIO", lv: 3, d: "1〜3着の<b>3頭の組み合わせ</b>（順番は問わない）", ex: "3−5−7 → 1〜3着が③⑤⑦なら、どの順でも的中", pt: "3頭の組み合わせ1つ＝1点" },
    { nm: "3連単", en: "TRIFECTA", lv: 4, d: "1〜3着を<b>着順どおり</b>に当てる", ex: "3→5→7 → ③が1着・⑤が2着・⑦が3着のときだけ", pt: "いちばん難しく、いちばん高配当" },
  ];
  const MODES = [
    { nm: "通常", d: "1点ずつ買う", ex: "馬連 3−7 → 1点" },
    { nm: "ボックス", d: "えらんだ馬の<b>すべての組み合わせ</b>", ex: "馬連 3頭（3・5・7）→ 3点／3連単 4頭 → 24点" },
    { nm: "ながし", d: "<b>軸</b>の馬と<b>相手</b>の組み合わせ。馬単・3連単は軸の着順（1着・2着…）や<b>マルチ</b>（軸がどの着順でも）をえらべる", ex: "馬連 軸③・相手5頭 → 5点" },
    { nm: "フォーメーション", d: "着順（○頭目）ごとに候補をえらぶ", ex: "3連単 1着[③] → 2着[①⑦] → 3着[①⑤⑦] → 4点" },
  ];

  /* ══════════ 画面 ══════════ */
  let el = null, sceneI = 0, timers = [], auto = true;
  function clearT() { timers.forEach((t) => clearTimeout(t)); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function shell() {
    if (el && el.isConnected) return el;
    el = document.createElement("div");
    el.id = "mdHelp"; el.className = "mdh";
    el.innerHTML = '<div class="mdh-bg" data-hx></div><div class="mdh-pane" role="dialog" aria-modal="true" aria-label="MagiDerby の使い方">' +
      '<div class="mdh-hd"><b>MagiDerby の使い方</b><button class="mdh-x" data-hx aria-label="閉じる">✕</button></div>' +
      '<div class="mdh-tabs"><button data-ht="howto">使い方<small>アニメ</small></button><button data-ht="types">馬券の種類</button><button data-ht="rules">きまり</button></div>' +
      '<div class="mdh-body"></div></div>';
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      const t = e.target.closest("[data-hx],[data-ht],[data-hs]");
      if (!t) return;
      if (t.hasAttribute("data-hx")) { close(); return; }
      if (t.dataset.ht) { show(t.dataset.ht); return; }
      const v = t.dataset.hs;
      if (v === "prev") goScene(Math.max(0, sceneI - 1), true);
      else if (v === "next") goScene(Math.min(SCENES.length - 1, sceneI + 1), true);
      else if (v === "again") { auto = true; goScene(0, false); }
      else if (/^\d+$/.test(v)) goScene(Number(v), true);
    });
    return el;
  }
  function howtoHTML() {
    return '<div class="mdh-how"><div class="mk-phone"><div class="mk-screen"></div><i class="mk-fg" aria-hidden="true"></i></div>' +
      '<div class="mdh-cap"><p class="c"></p><p class="s"></p></div>' +
      '<div class="mdh-ctl"><button data-hs="prev" aria-label="もどる">‹</button><span class="mdh-dots">' + SCENES.map((_, i) => '<i data-hs="' + i + '"></i>').join("") + '</span><button data-hs="next" aria-label="すすむ">›</button></div>' +
      '<button class="mdh-again" data-hs="again">⟲ はじめから見る</button></div>';
  }
  function typesHTML() {
    const stars = (n) => "★".repeat(n + 1) + "☆".repeat(4 - n);
    return '<p class="mdh-lead">当たる条件がちがう<b>8つの券種</b>があります。むずかしい券種ほど、当たったときの払い戻し（配当）が大きくなります。</p>' +
      '<div class="mdh-types">' + TYPES.map((t) => '<div class="mdh-t"><div class="mdh-th"><b>' + t.nm + "</b><small>" + t.en + '</small><span class="lv" title="むずかしさ">' + stars(t.lv) + "</span></div>" +
        '<p class="d">' + t.d + '</p><p class="ex"><i>例</i>' + esc(t.ex) + '</p><p class="pt">' + esc(t.pt) + "</p></div>").join("") + "</div>" +
      '<h4 class="mdh-h">買い方（2頭・3頭の券種）</h4><div class="mdh-modes">' + MODES.map((m) => '<div class="mdh-m"><b>' + m.nm + '</b><p>' + m.d + '</p><p class="ex"><i>例</i>' + esc(m.ex) + "</p></div>").join("") + "</div>" +
      '<p class="mdh-note">「点数」＝買い目（組み合わせ）の数。金額は<b>1点あたり</b>なので、合計は「点数 × 1点の金額」です。</p>';
  }
  function rulesHTML() {
    const li = (h, b) => "<li><b>" + h + "</b><span>" + b + "</span></li>";
    return '<ul class="mdh-rules">' +
      li("賭けるもの", "XEVA（1 XEVA ＝ 1円）。1点 <b>" + fmt(D.UNIT) + " XEVA</b> から " + fmt(D.UNIT) + " XEVA 単位・1レース <b>" + fmt(D.MAX_PER_RACE) + " XEVA</b> まで") +
      li("払い戻し", "<b>実際の払戻金</b>（100円あたり）をそのまま 100 XEVA あたりで。例：単勝 530円 → 100 XEVA が 530 XEVA に") +
      li("発売の時間", "レースの日の<b>" + (D.SALE_DAYS_BEFORE || 3) + "日前の 0:00</b> 〜 締切（<b>発走の" + D.CLOSE_BEFORE / 60 + "分前</b>）。時刻は端末の時計ではなくサーバーの時刻で判定。オフラインでは買えません") +
      li("枠順の発表前", "馬名で買えます（馬番は「?」）。発表されしだい券に本当の馬番が入ります。発表までに出走しなくなった馬を含む組は返還") +
      li("結果と払い戻し", "この端末が<b>結果のデータを受け取りしだい</b>。データは自動で集めているので、<b>反映の時刻は前後します</b>（ふつうはレースの数分〜数十分後。PC の自動取得の具合で、もっとおそくなることも）。結果が出た券は「馬券」タブで押して確認すると払い戻し") +
      li("返還", "出走取消・競走除外の馬を含む組み合わせは、その点の金額を返します（JRA と同じ）") +
      li("ライブ配信", 'JRA 公式の無料ライブ（グリーンチャンネル「中央競馬全レース中継」）。開催日の 9時〜17時ごろ・映像は20〜30秒ほど遅れます。<a href="' + LIVE_URL + '" target="_blank" rel="noopener">JRA 公式のレースライブ ↗</a>') +
      "</ul>";
  }
  function show(tab) {
    const box = shell(), body = box.querySelector(".mdh-body");
    clearT();
    box.querySelectorAll(".mdh-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.ht === tab));
    body.innerHTML = tab === "types" ? typesHTML() : tab === "rules" ? rulesHTML() : howtoHTML();
    body.scrollTop = 0;
    if (tab === "howto") { auto = true; goScene(0, false); }
  }
  /* 場面を出して、指を順に動かす（manual＝自分で選んだ：自動で次へ進まない） */
  function goScene(i, manual) {
    clearT();
    if (manual) auto = false;
    sceneI = i;
    const box = el && el.querySelector(".mdh-how"); if (!box) return;
    const S = SCENES[i], scr = box.querySelector(".mk-screen"), fg = box.querySelector(".mk-fg");
    scr.innerHTML = '<div class="mk-sc">' + S.html + "</div>";
    box.querySelector(".mdh-cap .c").innerHTML = S.cap;
    box.querySelector(".mdh-cap .s").innerHTML = S.sub;
    box.querySelectorAll(".mdh-dots i").forEach((d, k) => d.classList.toggle("on", k === i));
    const sc = scr.firstChild;
    const rm = RM();
    fg.classList.remove("tap"); fg.style.opacity = rm ? "0" : "1";
    fg.style.transition = "none"; fg.style.left = "78%"; fg.style.top = "92%";
    void fg.offsetWidth;
    fg.style.transition = "";
    let t = 450;
    S.steps.forEach((st) => {
      const [k, dur, act] = st;
      later(() => {
        const tg = sc.querySelector('[data-k="' + k + '"]'); if (!tg) return;
        const pr = box.querySelector(".mk-phone").getBoundingClientRect(), r = tg.getBoundingClientRect();
        fg.style.left = ((r.left + r.width * 0.55 - pr.left) / pr.width * 100) + "%";
        fg.style.top = ((r.top + r.height * 0.6 - pr.top) / pr.height * 100) + "%";
      }, t);
      t += rm ? 200 : 650;
      later(() => {
        fg.classList.remove("tap"); void fg.offsetWidth; fg.classList.add("tap");
        const tg = sc.querySelector('[data-k="' + k + '"]'); if (tg) { tg.classList.remove("mk-hit"); void tg.offsetWidth; tg.classList.add("mk-hit"); }
        if (act) act(sc);
      }, t);
      t += dur;
    });
    if (auto && i < SCENES.length - 1) later(() => goScene(i + 1, false), t + 900);
  }
  function open(tab) {
    const box = shell();
    show(tab || "howto");
    requestAnimationFrame(() => box.classList.add("on"));
    try { if (window.XOS && window.XOS.haptic) window.XOS.haptic(); } catch (e) {}
  }
  function close() { clearT(); if (el) el.classList.remove("on"); }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && el && el.classList.contains("on")) close(); });
  window.MD_HELP = { open: open, close: close, LIVE_URL: LIVE_URL, isOpen: () => !!(el && el.classList.contains("on")) };
})();
