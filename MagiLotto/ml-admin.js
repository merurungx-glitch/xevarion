/* ============================================================
   Magi Lotto — 管理画面（運営だけ）
   ------------------------------------------------------------
   ★ 出入口は「設定 → 運営メニュー」。開けるのは
     admin.html でアクセスコードを通した端末だけ（xeva_admin_ok_v1 / xeva_admin_unlocked_v1）。
   ★ できること
       ・販売価格／当選確率／報酬倍率／最低保証／積立率の変更
       ・設定した値からの<b>期待還元率の自動計算</b>
       ・サーバーに貯まった<b>実測</b>（総購入額・総払戻額・実測還元率・
         当選ランクごとの発生回数）との突き合わせ
       ・賞金プールの状態、いまのGEM/XEVAレート
   ★ 設定はサーバー（magilotto/cfg）に保存され、全端末に反映される。
     ここを直しても<b>抽選の実装は1行も変わらない</b>——
     ml-core.js のテーブルを読んでいるだけなので、値を変えれば確率も表示も同時に変わる。
   ============================================================ */
(function () {
  "use strict";
  const ML = window.ML;
  const $ = ML.$, fmt = ML.fmt, esc = ML.esc;

  let draft = null;      // 編集中の設定（保存するまでサーバーへは送らない）
  let stats = null;      // サーバーの実測

  function num(path, label, step) {
    const v = get(draft, path);
    return '<div class="row"><label>' + esc(label) + '</label>' +
      '<input type="number" step="' + (step || "any") + '" value="' + v + '" data-p="' + path + '"></div>';
  }
  function get(o, path) { return path.split(".").reduce((a, k) => (a == null ? a : a[k]), o); }
  function set(o, path, v) {
    const ks = path.split("."); const last = ks.pop();
    const t = ks.reduce((a, k) => (a[k] = a[k] || {}), o);
    t[last] = v;
  }

  async function open() {
    if (!ML.isAdmin()) { ML.toast("管理画面は運営専用です"); return; }
    draft = JSON.parse(JSON.stringify(ML.cfg()));
    stats = null;
    render();
    /* 実測はサーバーから取る（届いたら描き直す） */
    const F = ML.fb();
    if (F && F.mlGetStats) { try { stats = await F.mlGetStats(); render(); } catch (e) {} }
  }

  function render() {
    const c = draft;
    const sc = calc("scratch"), nu = calc("numbers"), lo = calc("lotto"), gr = calc("grand");
    const all = weighted([sc, nu, lo, gr]);
    ML.sheet({
      icon: "🛠", title: "Magi Lotto 管理画面",
      html: '<div class="ml-adm">' +
        /* ── ① 全体 ── */
        '<div class="hd">設計上の還元率（いまの設定から計算）</div>' +
        '<table class="ml-tbl"><tr><th>コンテンツ</th><th>価格(XEVA)</th><th>当たる確率</th><th>還元率</th></tr>' +
          row("SCRATCH", c.scratch.price, sc) + row("NUMBERS", c.numbers.price, nu) +
          row("LOTTO", c.lotto.price, lo) + row("GRAND DRAW", c.grand.price, gr) +
          '<tr><td><b>平均</b></td><td></td><td></td><td><b>' + ML.pct(all, 2) + "</b></td></tr></table>" +
        '<div class="ml-note" style="margin-top:6px">※ GRAND DRAW は 1等（賞金プール ' + fmt(ML.pool()) +
          " XEVA）を含めた値。プールが育つほど上がります。</div>" +

        /* ── ② 実測 ── */
        '<div class="hd">実測（サーバーに貯まった全ユーザーの合計）</div>' +
        (stats
          ? '<div class="ml-kv"><span>総購入額（XEVA換算）</span><span>' + fmt(stats.wagered || 0) + "</span></div>" +
            '<div class="ml-kv"><span>総払戻額</span><span>' + fmt(stats.won || 0) + "</span></div>" +
            '<div class="ml-kv"><span>実測還元率</span><span style="color:var(--gold)">' +
              (stats.wagered ? ML.pct((stats.won || 0) / stats.wagered, 2) : "—") + "</span></div>" +
            '<div class="ml-kv"><span>プレイ回数</span><span>' + fmt(stats.plays || 0) + "</span></div>" +
            byGameHTML(stats) + tiersHTML(stats)
          : '<div class="ml-note">読み込み中…（オフラインのときは出ません）</div>') +

        /* ── ③ 設定 ── */
        '<div class="hd">SCRATCH</div>' +
        num("scratch.price", "1枚の価格（XEVA）", 10) +
        c.scratch.tiers.map((t, i) =>
          num("scratch.tiers." + i + ".mul", t.nm + "：倍率", 1) +
          num("scratch.tiers." + i + ".prob", t.nm + "：確率", 0.00001)).join("") +

        '<div class="hd">NUMBERS</div>' +
        num("numbers.price", "1口の価格（XEVA）", 10) +
        num("numbers.straight.distinct", "ストレート（3つとも違う）", 1) +
        num("numbers.straight.pair", "ストレート（2つ同じ）", 1) +
        num("numbers.straight.triple", "ストレート（ぞろ目）", 1) +
        num("numbers.box.distinct", "ボックス（3つとも違う）", 1) +
        num("numbers.box.pair", "ボックス（2つ同じ）", 1) +
        num("numbers.pos2", "2桁一致", 1) + num("numbers.pos1", "1桁一致", 1) +

        '<div class="hd">LOTTO</div>' +
        num("lotto.price", "1口の価格（XEVA）", 10) +
        num("lotto.range", "数字の範囲（1〜N）", 1) + num("lotto.pick", "えらぶ個数", 1) +
        [6, 5, 4, 3, 2].map((k) => num("lotto.mul." + k, k + "個一致：倍率", 1)).join("") +

        '<div class="hd">MAGI GRAND DRAW</div>' +
        num("grand.price", "1口の価格（XEVA）", 10) +
        num("grand.range", "数字の範囲（1〜N）", 1) + num("grand.pick", "えらぶ個数", 1) +
        num("grand.mul.r2", "2等：倍率", 1) + num("grand.mul.r3", "3等：倍率", 1) +
        num("grand.mul.r4", "4等：倍率", 1) + num("grand.mul.r5", "5等：倍率", 1) +
        num("grand.minGuarantee", "1等の最低保証（XEVA）", 1000) +
        num("grand.seedPerDraw", "抽選回ごとの運営積み増し（XEVA）", 1000) +
        num("grand.seedCeiling", "積み増しの上限（ここまでしか積まない）", 1000) +
        num("grand.poolRate", "購入額からの積立率", 0.001) +
        num("grand.poolBoost", "積立の倍率", 1) +

        '<div class="hd">FREE MAGI（重み）</div>' +
        c.free.wheel.map((w, i) => num("free.wheel." + i + ".w", w.nm, 0.01)).join("") +

        '<div class="hd">そのほか</div>' +
        '<div class="ml-kv"><span>いまの GEM/XEVA レート（表示のみ）</span><span>💎1 ＝ ' + fmt(ML.gemRate()) + " XEVA</span></div>" +
        '<div class="ml-kv"><span>賞金プール</span><span>' + fmt(ML.pool()) + " XEVA（" + ML.poolState() + "）</span></div>" +
        '<div class="ml-note" style="margin-top:8px">※ 購入も配当も <b>XEVA だけ</b>なので、レートは還元率に一切からみません' +
          "（FREE MAGI で当たる💎の値打ちを示すためだけに出しています）。</div>" +
        "</div>",
      buttons: [
        { id: "save", nm: "この内容で保存（全端末に反映）", tone: "go" },
        { id: "reset", nm: "既定値にもどす", tone: "warn" },
        { id: "x", nm: "とじる" },
      ],
    }).then(async (r) => {
      if (r === "save") await saveCfg();
      else if (r === "reset") {
        draft = ML.defaults();
        render();
      }
    });
    /* 入力を draft に反映して、還元率をその場で計算し直す */
    setTimeout(() => {
      document.querySelectorAll("#mlSheetCard [data-p]").forEach((inp) => {
        inp.onchange = () => {
          set(draft, inp.getAttribute("data-p"), Number(inp.value));
          render();
        };
      });
    }, 0);
  }

  function row(nm, price, r) {
    return "<tr><td>" + nm + "</td><td>" + fmt(price) + "</td><td>" + ML.pct(r.hit, 1) + "</td><td>" + ML.pct(r.rtp, 2) + "</td></tr>";
  }
  /* 編集中の draft で計算する（保存前でも数字が動く） */
  function calc(which) {
    const keep = ML.cfg();
    ML.applyCfgSilent(draft);
    let r;
    if (which === "scratch") r = ML.rtpScratch();
    else if (which === "numbers") r = ML.rtpNumbers("distinct");
    else if (which === "lotto") r = ML.rtpLotto();
    else r = ML.rtpGrand(ML.poolRaw());
    r.price = draft[which].price;
    ML.applyCfgSilent(keep);
    return r;
  }
  function weighted(list) {
    let w = 0, ev = 0;
    list.forEach((r) => { w += r.price; ev += r.price * r.rtp; });
    return w ? ev / w : 0;
  }
  function byGameHTML(s) {
    const g = s.byGame || {};
    const ks = Object.keys(g);
    if (!ks.length) return "";
    return '<table class="ml-tbl" style="margin-top:8px"><tr><th>コンテンツ</th><th>購入</th><th>払戻</th><th>実測</th></tr>' +
      ks.map((k) => "<tr><td>" + esc(k) + "</td><td>" + fmt(g[k].wagered || 0) + "</td><td>" + fmt(g[k].won || 0) +
        "</td><td>" + (g[k].wagered ? ML.pct((g[k].won || 0) / g[k].wagered, 1) : "—") + "</td></tr>").join("") + "</table>";
  }
  function tiersHTML(s) {
    const t = s.tiers || {};
    const ks = Object.keys(t).sort();
    if (!ks.length) return "";
    return '<div class="hd">当選ランクごとの発生回数</div><table class="ml-tbl">' +
      ks.map((k) => "<tr><td>" + esc(k) + "</td><td>" + fmt(t[k]) + "</td></tr>").join("") + "</table>";
  }

  async function saveCfg() {
    const F = ML.fb();
    if (!F || !F.mlSetConfig) { ML.toast("サーバーに接続できません"); return; }
    const r = await F.mlSetConfig(draft);
    if (r && r.error) { ML.toast("保存に失敗しました（通信）"); return; }
    ML.applyCfg(draft);
    ML.toast("保存しました。全端末に反映されます", 3000);
    ML.paintHome();
  }

  ML.admin = { open };
})();
