/* ============================================================
   Magi Lotto — SCRATCH / NUMBERS / LOTTO / FREE MAGI の画面
   ------------------------------------------------------------
   ★ この4つは「役割がちがう」ように作る。似せない。
       SCRATCH … 自分の指で開ける。あと1マスの緊張がぜんぶ。
       NUMBERS … 自分で数字を考える。選んだ数字が主役。
       LOTTO   … 大当たりを狙う。盤面から6個えらぶ「重さ」を出す。
       FREE    … 毎日の1回。軽く回して、すぐ終わる。
   ★ 出目には一切さわらない。ml-draw.js が返した結果を、そのまま見せるだけ。
   ============================================================ */
(function () {
  "use strict";
  const ML = window.ML;
  const $ = ML.$, fmt = ML.fmt, esc = ML.esc;

  /* ══════════════════════════════════════════════════════════
     共通：買うバー
     ★ 支払いは XEVA だけ（2026-08-13〜）。通貨の選択肢は無い。
       「いくら減るのか」は必ずボタンの中に出す。
     ══════════════════════════════════════════════════════════ */
  function buyBar(o) {
    /* o = { price, label, onBuy, disabled, note, c } */
    const bar = $("#mlBuy"); if (!bar) return;
    const poor = !ML.canPay(o.price);
    bar.style.setProperty("--c", o.c || "#6b8cff");
    /* ★ 「XEVA が足りない」ときはボタンを<b>押せるまま</b>にして、
       押したら増やし方の案内を出す。灰色にして黙って終わると、
       どうすれば遊べるのかが画面のどこにも書いていないことになる。 */
    bar.innerHTML =
      '<button class="ml-bbtn ' + (poor ? "poor" : "") + '" id="mlBuyBtn" ' + (o.disabled ? "disabled" : "") + ">" +
        "<b>" + esc(o.label || "買う") + "</b><small>" +
        (o.disabled ? esc(o.note || "—") : poor ? "XEVA が足りません" : ML.priceText(o.price)) +
      "</small></button>";
    const btn = bar.querySelector("#mlBuyBtn");
    if (btn && !o.disabled) btn.onclick = poor ? () => poorSheet(o.price) : o.onBuy;
  }

  /* 共通：ゲーム画面のヘッダ（もどる／名前／？） */
  function head(key, help) {
    const g = ML.GAMES[key];
    return '<div class="ml-ghead" style="--c:' + g.c + '">' +
      '<button class="b" onclick="mlGo(\'home\')" aria-label="ホームへもどる">‹</button>' +
      '<span class="t"><span class="en">' + g.en + '</span><span class="ja">' + g.ja + " — " + g.ds + "</span></span>" +
      '<button class="q" onclick="' + help + '" aria-label="あそびかた">?</button></div>';
  }

  /* 共通：ボールが1つずつ出てくる抽選演出。終わったら resolve する。 */
  function rollBalls(box, nums, hitFn, opt) {
    const o = opt || {};
    box.innerHTML = "";
    return new Promise((res) => {
      let i = 0;
      const step = () => {
        if (i >= nums.length) { setTimeout(res, o.endWait == null ? 320 : o.endWait); return; }
        const n = nums[i];
        const cls = o.magiAt === i ? "magi" : (hitFn && hitFn(n, i) ? "hit" : "");
        const el = document.createElement("span");
        el.className = "ml-ball " + cls;
        el.textContent = n;
        box.appendChild(el);
        ML.sfx(cls === "hit" ? "reveal" : "ball");
        i++;
        setTimeout(step, o.gap || 420);
      };
      setTimeout(step, 220);
    });
  }

  /* 共通：結果の見せかた（当たりは段ごとの演出、ハズレは静かに） */
  async function showResult(o) {
    /* o = { win, mul, nm, lines, gem } */
    if (o.win > 0 || o.gem > 0) {
      await ML.celebrate({
        tier: ML.tierOf(o.mul || (o.gem ? 3 : 1)),
        title: o.title, sub: o.nm, mul: o.mul, amount: o.gem || o.win, gem: !!o.gem, lines: o.lines,
      });
    } else {
      ML.sfx("miss");
      const ov = $("#mlMiss");
      if (!ov) return;
      ov.querySelector("#mlMissBody").innerHTML = o.lines || "";
      ov.classList.add("on");
      await new Promise((res) => { ov.querySelector("#mlMissOk").onclick = () => { ov.classList.remove("on"); res(); }; });
    }
    ML.paintWal();
  }

  /* 買えなかったときの案内（XEVA の増やし方まで案内する） */
  function poorSheet(price) {
    ML.sheet({
      icon: "💠", title: "XEVA が足りません",
      html: "この購入には <b>" + ML.priceText(price) + "</b> が必要です（いまの残高 " + fmt(ML.xeva()) + " XEVA）。<br><br>" +
        "・毎日 <b>0円で引ける FREE MAGI</b> があります。まずはこちらをどうぞ。<br>" +
        "・XEVA は XEVARION の<b>ログインボーナス</b>・<b>ミッション</b>・各アプリのプレイで増やせます。<br>" +
        "・Magi Lotto は <b>XEVA だけ</b>で遊べます（💎ジェムでは買えません。💎は FREE MAGI のごほうびとして当たります）。",
      buttons: [{ id: "free", nm: "🎁 FREE MAGI を引く（無料）", tone: "go" }, { id: "home", nm: "XEVARION ホームへ" }, { id: "x", nm: "とじる" }],
    }).then((r) => {
      if (r === "free") window.mlGo("free");
      else if (r === "home") location.href = "../index.html";
    });
  }

  /* ══════════════════════════════════════════════════════════
     ① SCRATCH — 演出を楽しむ
     ══════════════════════════════════════════════════════════ */
  /* ══ 絵柄 ══
     ★ 最上位（s6・×1,000）だけ Magi Lotto 専用の描き下ろし。
       s1〜s5 は XEVARION（MagiBurst）のキャラをそのまま使う。
       ・画像は <b>../img/ を直接参照</b>する。MagiLotto/img へコピーしない
         （同じ絵を2か所に置くと、片方だけ差し替わって食いちがうため）。
       ・並びは「弱い → 強い」。蒼夏祭の顔ぶれでそろえてある。
       ★ 2026-08-16 ×100「メガ」をセイラ→<b>チヅル</b>に差し替えた。
         最上位 s6「マギ・フォルトゥナ」の描き下ろしがセイラをもとにした絵なので、
         すぐ下の段に本人が並ぶと同じ顔が2つ続いて見えてしまうため。 */
  const SC_ICON = {
    s1: { img: "../img/t_Fuka.webp",    nm: "フウカ" },
    s2: { img: "../img/t_Tsumugi.webp", nm: "ツムギ" },
    s3: { img: "../img/t_Suzuka.webp",  nm: "スズカ" },
    s4: { img: "../img/t_Karem.webp",   nm: "カレム" },
    s5: { img: "../img/t_Chizuru.webp", nm: "チヅル" },
    s6: { img: "img/sym_s6.webp",       nm: "マギ・フォルトゥナ" },
  };
  function scImg(id, cls) {
    const s = SC_ICON[id];
    if (!s) return "";
    return '<img class="' + (cls || "") + '" src="' + s.img + '" alt="' + esc(s.nm) + '" loading="lazy">';
  }
  function scMul(id) { const t = ML.cfg().scratch.tiers.find((x) => x.id === id); return t ? t.mul : 0; }
  function scNm(id) { return (SC_ICON[id] && SC_ICON[id].nm) || ""; }

  const scratch = (function () {
    let card = null;           // { grid, tier, mul, nm, win, stake, open:[bool×9], done }
    function open() {
      const el = $("#mlScratch"); if (!el) return;
      const sc = ML.rtpScratch();
      const price = ML.cfg().scratch.price;
      el.innerHTML = head("scratch", "mlScHelp()") +
        '<div id="mlScCard"></div>' +
        '<div class="ml-card"><div class="ml-h" style="margin:0 0 6px">配当（同じ絵柄が3つ）</div>' +
        '<div class="ml-pay sym"><span class="h">絵柄</span><span class="h m">配当</span><span class="h p">確率</span>' +
        ML.cfg().scratch.tiers.slice().reverse().map((t) =>
          '<span class="s">' + scImg(t.id, "pi") + "<i>" + esc(scNm(t.id)) + "<small>" + esc(t.nm) + "</small></i></span>" +
          "<span class='m'>×" + fmt(t.mul) + "<br><i style='font-size:9px;color:var(--sub);font-style:normal'>" +
          fmt(Math.round(price * t.mul)) + " XEVA</i></span>" +
          "<span class='p'>" + ML.pct(t.prob, t.prob < 0.001 ? 4 : 2) + "</span>").join("") +
        "</div>" +
        '<div class="ml-note" style="margin-top:8px">期待還元率 <b>' + ML.pct(sc.rtp, 1) + "</b>　／　当たる確率 <b>" + ML.pct(sc.hit, 1) + "</b>" +
        "<br>1枚 <b>" + ML.priceText(price) + "</b>。配当はこの額に倍率を掛けたものです。</div></div>";
      paintCard();
      bar();
    }
    function bar() {
      buyBar({
        price: ML.cfg().scratch.price, c: ML.GAMES.scratch.c,
        label: card && !card.done ? "削り終えてから" : "1枚 買って削る",
        disabled: !!(card && !card.done),
        note: "けずり中",
        onBuy: buy,
      });
    }
    function paintCard() {
      const box = $("#mlScCard"); if (!box) return;
      if (!card) {
        box.innerHTML = '<div class="ml-sccard"><div class="hd"><span>MAGI SCRATCH</span><span class="r">WIN UP TO ×' + fmt(scMul("s6")) + "</span></div>" +
          '<div class="ml-scgrid">' + Array.from({ length: 9 }, () =>
            '<div class="ml-cell"><span class="sym">?</span><span class="foil"></span></div>').join("") + "</div>" +
          '<div class="ml-scmsg">下の「1枚 買って削る」からはじめましょう</div></div>';
        return;
      }
      box.innerHTML = '<div class="ml-sccard"><div class="hd"><span>MAGI SCRATCH</span>' +
        '<span class="r" id="mlScLeft">' + headText() + "</span></div>" +
        '<div class="ml-scgrid" id="mlScGrid">' + card.grid.map((s, i) => {
          const on = card.open[i];
          const hit = card.done && card.mul && s === card.tierSym;
          return '<div class="ml-cell ' + (on ? "open " : "") + (hit ? "hit" : "") + '" data-i="' + i + '">' +
            '<span class="sym">' + scImg(s) + "</span><span class=\"foil\"></span></div>";
        }).join("") + "</div>" +
        '<div class="ml-scmsg" id="mlScMsg">' + msg() + "</div>" +
        (card.done ? "" : '<button class="ml-scall" id="mlScAllBtn" onclick="mlScAll()">のこりをまとめて削る</button>') + "</div>";
      const grid = $("#mlScGrid");
      if (grid) {
        grid.querySelectorAll(".ml-cell").forEach((c) => {
          const i = +c.getAttribute("data-i");
          const go = () => reveal(i);
          c.addEventListener("pointerdown", go);
          /* 指を滑らせても削れる（本物のスクラッチに近い手ざわり） */
          c.addEventListener("pointerenter", (e) => { if (e.buttons === 1) go(); });
        });
      }
    }
    /* カード右上の札。★ 2026-08-13 削っても「のこりNマス」が減らない不具合を修正。
       reveal() はカードを描き直さない（描き直すとめくったアニメが飛ぶ）ので、
       ここの文字だけを毎回入れ替える必要がある。 */
    function headText() {
      if (!card) return "";
      if (card.done) return card.mul ? "×" + fmt(card.mul) + " 当たり！" : "はずれ";
      return "のこり " + (9 - card.open.filter(Boolean).length) + " マス";
    }
    /* 「あと1つで揃う」の判定。開いた絵柄がちょうど2つで、まだ閉じたマスがあるとき。 */
    function teaseSym() {
      if (!card) return null;
      const cnt = {};
      card.grid.forEach((s, i) => { if (card.open[i]) cnt[s] = (cnt[s] || 0) + 1; });
      const closed = card.grid.some((s, i) => !card.open[i]);
      if (!closed) return null;
      let best = null;
      Object.keys(cnt).forEach((s) => {
        if (cnt[s] !== 2) return;
        /* まだ閉じているマスにその絵柄が残っていないと「あと1つ」にならない…
           のだが、閉じているマスの中身は<b>プレイヤーには見えていない</b>。
           見えている情報だけで「あと1つ」と言うのが正しいので、ここでは中身を見ない。 */
        if (!best || scMul(s) > scMul(best)) best = s;
      });
      return best;
    }
    function msg() {
      if (!card) return "";
      if (card.done) return card.mul ? esc(scNm(card.tierSym)) + " ×" + fmt(card.mul) + "　" + esc(card.nm) + "！" : "はずれ… 次の1枚へ";
      const t = teaseSym();
      if (t) return "あと1つで <b>" + esc(scNm(t)) + " ×" + fmt(scMul(t)) + "</b>！";
      return "9マスを削って、同じ絵柄を3つそろえよう";
    }
    function reveal(i) {
      if (!card || card.open[i] || card.done) return;
      card.open[i] = true;
      ML.sfx("scrape");
      const cell = document.querySelector('#mlScGrid .ml-cell[data-i="' + i + '"]');
      if (cell) cell.classList.add("open");
      /* ★ 右上の「のこりNマス」と、下のひとことを毎回そろえる */
      const lf = $("#mlScLeft"); if (lf) lf.textContent = headText();
      const m = $("#mlScMsg");
      const t = teaseSym();
      if (m) { m.innerHTML = msg(); m.classList.toggle("tease", !!t); }
      if (t) ML.sfx("tease");
      if (card.open.every(Boolean)) finish();
    }
    window.mlScAll = function () {
      if (!card || card.done) return;
      /* 「まとめて削る」でも一気には出さない。1マスずつ、少しだけ間を置く。 */
      const rest = [];
      card.open.forEach((o, i) => { if (!o) rest.push(i); });
      rest.forEach((i, k) => setTimeout(() => reveal(i), k * 110));
    };
    function finish() {
      card.done = true;
      paintCard();
      bar();
      setTimeout(async () => {
        await showResult({
          win: card.win, mul: card.mul, nm: card.nm,
          lines: card.mul
            ? "<b>" + esc(scNm(card.tierSym)) + "</b> が3つそろいました（" + ML.priceText(card.stake) + " → +" + fmt(card.win) + " XEVA）"
            : "そろいませんでした。<br>当たる確率は <b>" + ML.pct(ML.rtpScratch().hit, 1) + "</b>——次の1枚に期待しましょう。",
        });
      }, 420);
    }
    async function buy() {
      const price = ML.cfg().scratch.price;
      if (!ML.canPay(price)) { poorSheet(price); return; }
      buyBar({ price, c: ML.GAMES.scratch.c, label: "抽選中…", disabled: true, note: "しばらくお待ちください" });
      const r = await ML.draw.buy("scratch");
      if (!r.ok) { poorSheet(price); bar(); return; }
      const t = ML.cfg().scratch.tiers.find((x) => x.id === r.out.tier);
      card = {
        grid: r.out.grid, tier: r.out.tier, tierSym: t ? t.id : null,
        mul: r.out.mul || 0, nm: r.out.nm, win: r.win, stake: r.stake,
        open: new Array(9).fill(false), done: false,
      };
      ML.paintWal();
      paintCard();
      bar();
      ML.sfx("tap");
    }
    return { open, bar };
  })();
  ML.scratch = scratch;
  window.mlScHelp = function () {
    ML.sheet({
      icon: "🎟", title: "SCRATCH のあそびかた",
      html: "9つのマスを指で削って、<b>同じ絵柄が3つそろえば当たり</b>です。<br><br>" +
        "・削る順番は自由。まとめて削ることもできます。<br>" +
        "・同じ絵柄が<b>2つ</b>出たら「あと1つ」。最後の1マスがいちばん楽しいところです。<br>" +
        "・絵柄ごとに配当がちがいます（" + ML.cfg().scratch.tiers.map((t) => scNm(t.id) + " ×" + fmt(t.mul)).join(" ／ ") + "）。<br>" +
        "・結果は<b>買った時点でサーバー側に確定</b>しています。削り方で変わることはありません" +
        "（途中でアプリを閉じても、次に開いたときに精算されます）。",
    });
  };

  /* ══════════════════════════════════════════════════════════
     ② NUMBERS — 自分で数字を考える
     ══════════════════════════════════════════════════════════ */
  const numbers = (function () {
    let pick = [];      // 0〜9 を3つ
    let busy = false;

    function open() {
      const S = ML.state();
      if (!pick.length && Array.isArray(S.lastNumbers)) pick = S.lastNumbers.slice();
      const el = $("#mlNumbers"); if (!el) return;
      el.innerHTML = head("numbers", "mlNuHelp()") +
        '<div class="ml-card c" style="--c:' + ML.GAMES.numbers.c + '">' +
          '<div class="ml-note" style="text-align:center">あなたの数字（' + ML.cfg().numbers.digits + "桁）</div>" +
          '<div class="ml-picked" id="mlNuPick"></div>' +
          '<button class="ml-pick" onclick="mlNuMagi()">✦ MAGI PICK（おまかせ）</button>' +
          '<div class="ml-keys" id="mlNuKeys"></div>' +
        "</div>" +
        '<div id="mlNuDraw"></div>' +
        '<div class="ml-card" id="mlNuPay"></div>';
      keys();
      paintPick();
      paintPay();
      bar();
    }
    function keys() {
      const k = $("#mlNuKeys"); if (!k) return;
      let h = "";
      for (let i = 0; i <= 9; i++) h += '<button class="ml-key" data-n="' + i + '">' + i + "</button>";
      h += '<button class="ml-key wide" data-a="back">← 1つ消す</button>';
      h += '<button class="ml-key wide" data-a="clear">ぜんぶ消す</button>';
      k.innerHTML = h;
      k.querySelectorAll("[data-n]").forEach((b) => {
        b.onclick = () => {
          if (busy || pick.length >= ML.cfg().numbers.digits) return;
          pick.push(+b.getAttribute("data-n")); ML.sfx("tap"); paintPick(); paintPay(); bar();
        };
      });
      k.querySelector('[data-a="back"]').onclick = () => { if (busy) return; pick.pop(); ML.sfx("tap"); paintPick(); paintPay(); bar(); };
      k.querySelector('[data-a="clear"]').onclick = () => { if (busy) return; pick = []; ML.sfx("tap"); paintPick(); paintPay(); bar(); };
    }
    function paintPick(win) {
      const el = $("#mlNuPick"); if (!el) return;
      const d = ML.cfg().numbers.digits;
      let h = "";
      for (let i = 0; i < d; i++) {
        const v = pick[i];
        const hit = win && v != null && win[i] === v;
        h += '<div class="ml-dg ' + (hit ? "win" : "") + " " + (v == null && i === pick.length ? "sel" : "") + '">' +
          (v == null ? "–" : v) + "</div>";
      }
      el.innerHTML = h;
    }
    /* ★ 選んだ数字の「並びのパターン」で配当が変わるので、
       いま選んでいる数字の配当表と期待還元率をその場で出す（隠さない）。 */
    function paintPay() {
      const box = $("#mlNuPay"); if (!box) return;
      const full = pick.length === ML.cfg().numbers.digits;
      const pat = full ? ML.numPattern(pick) : "distinct";
      const r = ML.rtpNumbers(pat);
      const PN = { distinct: "3つとも違う数字", pair: "2つ同じ数字", triple: "ぞろ目" };
      const stake = ML.cfg().numbers.price;
      box.innerHTML = '<div class="ml-h" style="margin:0 0 6px">配当 <small>' +
        (full ? "選んだ数字（" + PN[pat] + "）のばあい" : "3つとも違う数字のばあい") + "</small></div>" +
        '<div class="ml-pay"><span class="h">当選ランク</span><span class="h m">配当</span><span class="h p">確率</span>' +
        r.rows.map((x) => "<span>" + esc(x.nm) + "</span><span class='m'>×" + fmt(x.mul) +
          "<br><i style='font-size:9px;color:var(--sub);font-style:normal'>" + fmt(Math.round(stake * x.mul)) + " XEVA</i></span>" +
          "<span class='p'>" + ML.pct(x.prob, 3) + "</span>").join("") +
        "</div>" +
        '<div class="ml-note" style="margin-top:8px">期待還元率 <b>' + ML.pct(r.rtp, 1) + "</b>　／　当たる確率 <b>" + ML.pct(r.hit, 1) + "</b>" +
        "<br>※ <b>どの数字を選んでも還元率は同じ</b>になるよう、並びのパターンごとに配当を調整しています。" +
        "<b>MAGI PICK</b> でも確率・配当は変わりません。</div>";
    }
    function bar() {
      const full = pick.length === ML.cfg().numbers.digits;
      buyBar({
        price: ML.cfg().numbers.price, c: ML.GAMES.numbers.c,
        label: full ? "この数字で買う" : "数字を" + (ML.cfg().numbers.digits - pick.length) + "つえらぶ",
        disabled: !full || busy, note: busy ? "抽選中…" : "数字をえらんでください",
        onBuy: buy,
      });
    }
    window.mlNuMagi = function () {
      if (busy) return;
      const a = new Uint32Array(ML.cfg().numbers.digits);
      crypto.getRandomValues(a);
      pick = Array.from(a).map((x) => x % 10);
      ML.sfx("tap"); paintPick(); paintPay(); bar();
      ML.toast("✦ MAGI PICK：<b>" + pick.join(" - ") + "</b><br><span style='font-size:10px;color:var(--sub)'>おまかせでも当たりやすさは変わりません</span>", 2200);
    };
    async function buy() {
      const price = ML.cfg().numbers.price;
      if (!ML.canPay(price)) { poorSheet(price); return; }
      busy = true; bar();
      const r = await ML.draw.buy("numbers", pick.slice());
      if (!r.ok) { busy = false; bar(); poorSheet(price); return; }
      const S = ML.state(); S.lastNumbers = pick.slice(); ML.save();
      ML.paintWal();
      /* 抽選演出：3桁が1つずつ出る */
      const box = $("#mlNuDraw");
      box.innerHTML = '<div class="ml-card"><div class="ml-drawlb">抽選結果</div><div class="ml-balls" id="mlNuBalls"></div></div>';
      await rollBalls($("#mlNuBalls"), r.out.win, (n, i) => pick[i] === n, { gap: 520 });
      paintPick(r.out.win);
      busy = false; bar();
      const line = "あなた <b>" + pick.join("-") + "</b> ／ 抽選 <b>" + r.out.win.join("-") + "</b>";
      await showResult({
        win: r.win, mul: r.out.mul, nm: r.out.nm,
        lines: line + (r.win > 0 ? "<br>" + ML.priceText(r.stake) + " → <b>+" + fmt(r.win) + " XEVA</b>" : ""),
      });
    }
    return { open, bar };
  })();
  ML.numbers = numbers;
  window.mlNuHelp = function () {
    const c = ML.cfg().numbers;
    ML.sheet({
      icon: "🔢", title: "NUMBERS のあそびかた",
      html: "0〜9 を <b>" + c.digits + "つ</b>えらんで買います。抽選の" + c.digits + "桁とどれだけ合ったかで当選ランクが決まります。<br><br>" +
        "・<b>ストレート</b>＝位置までぴったり一致（最高配当）<br>" +
        "・<b>ボックス</b>＝順番はちがうが3つとも同じ数字<br>" +
        "・<b>2桁一致／1桁一致</b>＝位置が合った桁の数<br><br>" +
        "<b>MAGI PICK</b> はおまかせで数字を決める補助機能です。" +
        "<b>自分で選んでも MAGI PICK でも、当たりやすさはまったく同じ</b>です。<br><br>" +
        "選んだ数字の並び（ぞろ目かどうか）で「ボックスの起きやすさ」が変わるので、" +
        "そのぶん<b>配当のほうを調整</b>して、どの数字でも還元率が同じになるようにしています。" +
        "いま選んでいる数字の配当は、画面の下の表にそのまま出ています。",
    });
  };

  /* ══════════════════════════════════════════════════════════
     ③ LOTTO — 大当たりを狙う
     ══════════════════════════════════════════════════════════ */
  const lotto = (function () {
    let pick = [];
    let busy = false;

    function open() {
      const S = ML.state();
      if (!pick.length && Array.isArray(S.lastLotto)) pick = S.lastLotto.slice();
      const c = ML.cfg().lotto;
      const el = $("#mlLotto"); if (!el) return;
      el.innerHTML = head("lotto", "mlLoHelp()") +
        '<div class="ml-card c" style="--c:' + ML.GAMES.lotto.c + '">' +
          '<div class="ml-note" style="text-align:center">1〜' + c.range + " から <b>" + c.pick + "個</b>えらんでください</div>" +
          '<div class="ml-chips" id="mlLoChips"></div>' +
          '<div class="ml-board" id="mlLoBoard"></div>' +
          '<button class="ml-pick" style="border-color:rgba(255,107,125,.5);background:linear-gradient(180deg,rgba(255,107,125,.2),rgba(255,107,125,.06));color:#ffc4cb" onclick="mlLoMagi()">✦ MAGI PICK（おまかせ）</button>' +
          '<button class="ml-pick" style="margin-top:6px;border-color:var(--line);background:rgba(255,255,255,.06);color:var(--sub)" onclick="mlLoClear()">ぜんぶ消す</button>' +
        "</div>" +
        '<div id="mlLoDraw"></div>' +
        '<div class="ml-card" id="mlLoPay"></div>';
      board();
      paintChips();
      paintPay();
      bar();
    }
    function board(win) {
      const c = ML.cfg().lotto, b = $("#mlLoBoard"); if (!b) return;
      let h = "";
      for (let i = 1; i <= c.range; i++) {
        const on = pick.indexOf(i) >= 0;
        const hit = win && win.indexOf(i) >= 0 && on;
        h += '<button class="ml-bn ' + (hit ? "hit" : on ? "on" : "") + '" data-n="' + i + '">' + i + "</button>";
      }
      b.innerHTML = h;
      b.querySelectorAll("[data-n]").forEach((x) => { x.onclick = () => tap(+x.getAttribute("data-n")); });
    }
    function tap(n) {
      if (busy) return;
      const c = ML.cfg().lotto;
      const i = pick.indexOf(n);
      if (i >= 0) pick.splice(i, 1);
      else if (pick.length < c.pick) pick.push(n);
      else { ML.toast(c.pick + "個までです（外したい数字をもう一度押してください）"); return; }
      pick.sort((a, b2) => a - b2);
      ML.sfx("tap"); board(); paintChips(); bar();
    }
    function paintChips(win, hit) {
      const c = ML.cfg().lotto, el = $("#mlLoChips"); if (!el) return;
      let h = "";
      for (let i = 0; i < c.pick; i++) {
        const v = pick[i];
        const isHit = hit && v != null && hit.indexOf(v) >= 0;
        h += '<span class="ml-chip ' + (v == null ? "empty" : isHit ? "hit" : "") + '">' + (v == null ? "–" : v) + "</span>";
      }
      el.innerHTML = h;
    }
    function paintPay() {
      const box = $("#mlLoPay"); if (!box) return;
      const r = ML.rtpLotto();
      const stake = ML.cfg().lotto.price;
      box.innerHTML = '<div class="ml-h" style="margin:0 0 6px">配当</div>' +
        '<div class="ml-pay"><span class="h">当選ランク</span><span class="h m">配当</span><span class="h p">確率</span>' +
        r.rows.map((x) => "<span>" + esc(x.nm) + "</span><span class='m'>×" + fmt(x.mul) +
          "<br><i style='font-size:9px;color:var(--sub);font-style:normal'>" + fmt(Math.round(stake * x.mul)) + " XEVA</i></span>" +
          "<span class='p'>" + ML.odds(x.prob) + "</span>").join("") +
        "</div>" +
        '<div class="ml-note" style="margin-top:8px">期待還元率 <b>' + ML.pct(r.rtp, 1) + "</b>　／　当たる確率 <b>" + ML.pct(r.hit, 1) + "</b>" +
        "<br>※ <b>" + (ML.cfg().lotto.pick - 1) + "個一致 ×" + fmt(ML.cfg().lotto.mul[ML.cfg().lotto.pick - 1]) +
        " → " + ML.cfg().lotto.pick + "個一致 ×" + fmt(ML.cfg().lotto.mul[ML.cfg().lotto.pick]) +
        "</b>。上のランクに入った瞬間に、配当が一気に跳ね上がります。</div>";
    }
    function bar() {
      const c = ML.cfg().lotto;
      const full = pick.length === c.pick;
      buyBar({
        price: c.price, c: ML.GAMES.lotto.c,
        label: full ? "この" + c.pick + "個で買う" : "あと" + (c.pick - pick.length) + "個えらぶ",
        disabled: !full || busy, note: busy ? "抽選中…" : "数字をえらんでください",
        onBuy: buy,
      });
    }
    window.mlLoMagi = function () {
      if (busy) return;
      const c = ML.cfg().lotto;
      const bag = []; for (let i = 1; i <= c.range; i++) bag.push(i);
      const a = new Uint32Array(c.pick); crypto.getRandomValues(a);
      pick = [];
      for (let i = 0; i < c.pick; i++) pick.push(bag.splice(a[i] % bag.length, 1)[0]);
      pick.sort((x, y) => x - y);
      ML.sfx("tap"); board(); paintChips(); bar();
      ML.toast("✦ MAGI PICK：<b>" + pick.join(" ") + "</b><br><span style='font-size:10px;color:var(--sub)'>おまかせでも当たりやすさは変わりません</span>", 2200);
    };
    window.mlLoClear = function () { if (busy) return; pick = []; ML.sfx("tap"); board(); paintChips(); bar(); };
    async function buy() {
      const c = ML.cfg().lotto;
      if (!ML.canPay(c.price)) { poorSheet(c.price); return; }
      busy = true; bar();
      const r = await ML.draw.buy("lotto", pick.slice());
      if (!r.ok) { busy = false; bar(); poorSheet(c.price); return; }
      const S = ML.state(); S.lastLotto = pick.slice(); ML.save();
      ML.paintWal();
      const box = $("#mlLoDraw");
      box.innerHTML = '<div class="ml-card"><div class="ml-drawlb">抽選結果</div><div class="ml-balls" id="mlLoBalls"></div></div>';
      await rollBalls($("#mlLoBalls"), r.out.win, (n) => pick.indexOf(n) >= 0, { gap: 480 });
      board(r.out.win);
      paintChips(r.out.win, r.out.hit);
      busy = false; bar();
      const line = "あなた <b>" + pick.join(" ") + "</b><br>抽選 <b>" + r.out.win.join(" ") + "</b><br>一致 <b>" + r.out.k + "個</b>";
      await showResult({
        win: r.win, mul: r.out.mul, nm: r.out.nm,
        lines: line + (r.win > 0 ? "<br>" + ML.priceText(r.stake) + " → <b>+" + fmt(r.win) + " XEVA</b>" : ""),
      });
    }
    return { open, bar };
  })();
  ML.lotto = lotto;
  window.mlLoHelp = function () {
    const c = ML.cfg().lotto;
    ML.sheet({
      icon: "🎱", title: "LOTTO のあそびかた",
      html: "1〜" + c.range + " から <b>" + c.pick + "個</b>えらんで買います。抽選で出た" + c.pick + "個と、いくつ一致したかで当選ランクが決まります。<br><br>" +
        "・<b>" + c.pick + "個一致</b>で ×" + fmt(c.mul[c.pick]) + "。本作でいちばん大きい当たりです（" + ML.odds(ML.lottoProb(c.pick)) + "）。<br>" +
        "・<b>" + (c.pick - 1) + "個一致</b>でも ×" + fmt(c.mul[c.pick - 1]) + "。ここから上は一気に跳ね上がります。<br>" +
        "・<b>2個一致</b>ならかけたぶんが戻ります（" + ML.pct(ML.lottoProb(2), 1) + "）。<br><br>" +
        "<b>MAGI PICK</b> はおまかせで数字を決める補助機能です。自分で選んだ場合と<b>当たりやすさはまったく同じ</b>です。",
    });
  };

  /* ══════════════════════════════════════════════════════════
     ④ FREE MAGI — 毎日ログインする理由
     ══════════════════════════════════════════════════════════ */
  const free = (function () {
    let busy = false;
    function open() {
      const el = $("#mlFree"); if (!el) return;
      const S = ML.state();
      const ready = ML.draw.freeReady();
      el.innerHTML = head("free", "mlFrHelp()") +
        '<div class="ml-card c" style="--c:' + ML.GAMES.free.c + ';text-align:center">' +
          '<div class="ml-note">今日の運試し — <b>1日1回 無料</b>' +
          (S.freeStreak > 1 ? "　／　<b>" + S.freeStreak + "日連続</b>" : "") + "</div>" +
          /* ★ まん中はエンブレムの絵だけにする。状態（引ける／また明日）は
             すぐ下のボタンに出ているので、絵の上に文字を重ねると読みにくいだけ。 */
          '<div class="ml-wheelwrap">' + wheelSVG() +
            '<img class="ml-wemb" src="' + ML.GAMES.free.img + '" alt="FREE MAGI"></div>' +
          '<button class="ml-sbtn go" id="mlFreeBtn" style="margin-top:16px">' +
            (ready ? "🎁 回す（無料）" : "今日はもう引きました（あと " + ML.draw.freeLeftText() + "）") + "</button>" +
        "</div>" +
        '<div class="ml-card"><div class="ml-h" style="margin:0 0 6px">当たるもの</div>' +
          '<div class="ml-pay"><span class="h">賞品</span><span class="h m"></span><span class="h p">確率</span>' +
          (function () {
            const w = ML.cfg().free.wheel; let tot = 0; w.forEach((x) => { tot += x.w; });
            return w.map((x) => "<span>" + esc(x.nm) + "</span><span class='m'></span><span class='p'>" + ML.pct(x.w / tot, 2) + "</span>").join("");
          })() + "</div>" +
          '<div class="ml-note" style="margin-top:8px">無料なので還元率の計算には入っていません（まるごと上乗せです）。' +
          "まれに大きいものも当たりますが、有料のコンテンツほどの大当たりは出ません。</div></div>";
      const b = $("#mlFreeBtn");
      if (b) b.onclick = ready ? spin : () => ML.toast("次は 0:00 に復活します（あと " + ML.draw.freeLeftText() + "）");
    }
    /* ホイールは SVG でその場で描く（画像を増やさない・確率の並びとぴったり合う） */
    function wheelSVG() {
      const w = ML.cfg().free.wheel, n = w.length, R = 150, step = 360 / n;
      let h = '<svg id="mlWheel" viewBox="0 0 300 300" aria-hidden="true">';
      w.forEach((x, i) => {
        const a0 = (i * step - 90) * Math.PI / 180, a1 = ((i + 1) * step - 90) * Math.PI / 180;
        const x0 = 150 + R * Math.cos(a0), y0 = 150 + R * Math.sin(a0);
        const x1 = 150 + R * Math.cos(a1), y1 = 150 + R * Math.sin(a1);
        h += '<path d="M150 150 L' + x0.toFixed(1) + " " + y0.toFixed(1) + " A150 150 0 0 1 " + x1.toFixed(1) + " " + y1.toFixed(1) +
          ' Z" fill="' + x.c + '" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/>';
        const am = (i * step + step / 2 - 90) * Math.PI / 180;
        const tx = 150 + 98 * Math.cos(am), ty = 150 + 98 * Math.sin(am);
        h += '<text x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '" fill="#fff" font-size="13" font-weight="900" ' +
          'text-anchor="middle" dominant-baseline="middle" transform="rotate(' + (i * step + step / 2) + " " + tx.toFixed(1) + " " + ty.toFixed(1) + ')">' +
          esc(x.nm.replace(" XEVA", "")) + "</text>";
      });
      h += '<circle cx="150" cy="150" r="150" fill="none" stroke="#ffd257" stroke-width="4"/></svg>';
      return h;
    }
    async function spin() {
      if (busy) return;
      busy = true;
      const btn = $("#mlFreeBtn"); if (btn) { btn.disabled = true; btn.textContent = "抽選中…"; }
      const r = await ML.draw.spinFree();
      if (!r.ok) { busy = false; open(); return; }
      const w = ML.cfg().free.wheel, n = w.length, step = 360 / n;
      /* 当たったところが上（矢印）に来るように回す。5周まわしてから止める。 */
      const target = 360 * 5 - (r.i * step + step / 2);
      const el = $("#mlWheel");
      if (el) { el.style.transition = "none"; el.style.transform = "rotate(0deg)"; void el.offsetWidth;
        el.style.transition = "transform 4.6s cubic-bezier(.15,.86,.19,1)"; el.style.transform = "rotate(" + target + "deg)"; }
      ML.sfx("ball");
      await new Promise((res) => setTimeout(res, 4800));
      ML.paintWal();
      const isBig = (r.item.gem || 0) >= 10 || (r.item.xeva || 0) >= 1000;
      await ML.celebrate({
        tier: isBig ? "big" : (r.item.gem || 0) >= 3 || (r.item.xeva || 0) >= 300 ? "mid" : "small",
        title: "FREE MAGI", sub: "今日の運試し",
        amount: r.gem || r.xeva, gem: !!r.gem,
        lines: (r.streak > 1 ? "<b>" + r.streak + "日連続</b>で引いています。<br>" : "") + "次は 0:00 に復活します。",
      });
      busy = false;
      open();
      ML.paintHome();
    }
    return { open };
  })();
  ML.free = free;
  /* ml-grand.js からも「XEVA が足りません」の案内を出せるように公開する */
  ML.games = { poorSheet, buyBar, rollBalls, showResult, head, scImg, scNm, scMul, SC_ICON };
  window.mlFrHelp = function () {
    ML.sheet({
      icon: "🎁", title: "FREE MAGI のあそびかた",
      html: "<b>1日1回、無料</b>で回せます（毎日 0:00 に復活）。<br><br>" +
        "XEVA か 💎ジェムが当たります。まれに大きいものも出ますが、" +
        "有料コンテンツほどの大当たりは出ないようにしてあります（毎日気軽に引くためのものなので）。<br><br>" +
        "回している途中でアプリを閉じても、報酬は失われません。次に開いたときに受け取れます。",
    });
  };
})();
