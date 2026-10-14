/* ============================================================
   これって浮気？判定シート（uwaki.html）— ★★ 2026-10-15 新規（ご指定）
   ------------------------------------------------------------
   ・40個の行動を「浮気（2）／浮気じゃないけど嫌（1）／全然OK（0）」に仕分ける＋さいごの質問「自分がやる側なら答えは変わる？」
   ・結果：浮気ライン（きびしさ 0〜100）＝ 答えの合計 ÷ 80 × 100 → 6つのタイプ。ジャンルごとのきびしさと「境界線」、3つの仕分け表
   ・ふたりで比べる：答えを短いコード（UW1-…）にして、相手のコードと見くらべる（一致度・意見が分かれた項目）
   ・答えはこの端末の localStorage（xeva_uwaki_v1）だけ。サーバーには送らない
   ・質問の文・タイプ名・判定のしかたは XEVARION のオリジナル（話題の判定シートは「3つに仕分ける形式」だけを参考にした）
   ★ confirm() は出ない環境があるので、やり直しの確認はシートの中で聞く（MagiLex・MagiTier と同じ）
   ============================================================ */
(function () {
  "use strict";
  const $ = (q, el) => (el || document).querySelector(q);
  const $$ = (q, el) => Array.from((el || document).querySelectorAll(q));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  /* ══ 質問（ジャンルごとに、だいたい「ゆるい → きびしい」の順） ══ */
  const CATS = [
    { id: "meet", nm: "ふたりで会う", ic: "🍽️", items: [
      "異性の友だちと、昼に2人でランチ",
      "異性の友だちと、2人でカラオケ",
      "異性の友だちと、2人で映画を見に行く",
      "異性の同僚と、仕事帰りに2人で飲みに行く",
      "異性の友だちを、車で家まで送ってあげる",
      "異性の友だちと、2人で夜ごはん（お酒あり）",
      "異性の友だちと、2人で日帰り旅行",
      "恋人に言わずに、異性と2人で会う",
      "異性の友だちの部屋に、2人きりで上がる",
      "ノリで、異性の友だちと手をつなぐ",
    ] },
    { id: "msg", nm: "連絡・SNS", ic: "📱", items: [
      "異性の投稿に、毎回「いいね」する",
      "異性の友だちと、毎日メッセージのやりとり",
      "異性と、夜中に長電話する",
      "「おはよう」「おやすみ」を異性とも送り合う",
      "SNSで、恋人がいることを出していない",
      "異性とのトークを、恋人に見られたくない",
      "異性の写真を、スマホに保存している",
      "異性とのトークを、こまめに消している",
      "異性に「会いたいな」と送る",
      "マッチングアプリを、まだ消していない",
    ] },
    { id: "kind", nm: "やさしさ・特別あつかい", ic: "🎁", items: [
      "異性を「かわいい」「かっこいい」とほめる",
      "異性の誕生日に、プレゼントをあげる",
      "恋人の前で、異性の友だちをべたぼめする",
      "酔いつぶれた異性を、介抱して送る",
      "異性の悩み相談に、夜おそくまで乗る",
      "異性の友だちと、おそろいの物を持つ",
      "異性の友だちにだけ、手作りのお菓子をあげる",
      "落ちこんでいる異性の頭を、ぽんぽんする",
      "お祝いで、異性とハグする",
      "恋人より、異性の友だちの予定を優先する",
    ] },
    { id: "ex", nm: "元恋人", ic: "🥀", items: [
      "元恋人の連絡先を、消していない",
      "元恋人と、SNSでつながったまま",
      "元恋人からもらった物を、今も使っている",
      "元恋人との写真を、消さずに残している",
      "元恋人のSNSを、こっそり見に行く",
      "用事があって、元恋人と連絡をとる",
      "元恋人の誕生日に「おめでとう」を送る",
      "元恋人との思い出の場所に、今の恋人と行く",
      "元恋人に、今の恋の相談をする",
      "元恋人と、2人きりで会う",
    ] },
  ];
  const ITEMS = [];
  CATS.forEach((c, ci) => c.items.forEach((t, k) => ITEMS.push({ ci, k, t, no: ITEMS.length + 1 })));
  const N = ITEMS.length;           /* 40 */
  const ANS = [
    { v: 2, nm: "浮気", sh: "浮気", cls: "c2" },
    { v: 1, nm: "浮気じゃないけど嫌", sh: "嫌", cls: "c1" },
    { v: 0, nm: "全然OK", sh: "OK", cls: "c0" },
  ];
  const ANM = { 2: "浮気", 1: "浮気じゃないけど嫌", 0: "全然OK" };
  const SELF = [
    { nm: "変わらない", tx: "自分にも恋人にも<b>同じものさし</b>。フェアでえらい！" },
    { nm: "ゆるくなる", tx: "自分がやる側だと<b>ゆるくなる</b>……？ 恋人にも同じだけゆるくできるか、ちょっと考えてみて（ダブルスタンダード注意報）。" },
    { nm: "きびしくなる", tx: "自分には<b>もっときびしい</b>！ 誠実でまじめなタイプです。がんばりすぎないでね。" },
  ];
  /* ══ タイプ（浮気ラインの点で決まる） ══ */
  const TYPES = [
    { max: 12, ic: "🌞", nm: "おおらか太陽派", col: "#ffae22", cp: "「いいよ〜」と笑って許せる、ふところの広いタイプ",
      tx: "ほとんどのことは「全然OK」。恋人の交友関係を広く受け止められる、太陽みたいに明るいタイプです。",
      tip: "気にしていないつもりでも、相手は「大事にされてる？」と少し不安になることも。たまには「ちょっとだけ妬いたよ」と言葉にすると◎" },
    { max: 30, ic: "🌿", nm: "信じてまかせる派", col: "#27b46a", cp: "基本は相手を信じてまかせるタイプ",
      tx: "気になるのは、かくしごとや、度をこした行動くらい。こまかいことは気にしない、おとなの余裕があります。",
      tip: "「これだけはイヤ」という数少ないラインは、早めに伝えておくと、すれちがいを防げます。" },
    { max: 50, ic: "⚖️", nm: "ちょうどいいバランス派", col: "#3b8cff", cp: "OK と NG の線引きがはっきりしたタイプ",
      tx: "浮気・嫌・全然OK の仕分けがほどよいバランス。いろいろな人と話が合いやすいタイプです。",
      tip: "「嫌」の項目は、相手にとっては無意識のことも。責めるより「こうしてくれるとうれしい」の形で伝えるのがおすすめ。" },
    { max: 68, ic: "🍯", nm: "やきもちほんのり派", col: "#ff8a2a", cp: "好きだからこそ、ちょっとしたことも気になるタイプ",
      tx: "「浮気とまでは言わないけど嫌」が多め。恋人のことをよく見ていて、気持ちも大切にするタイプです。",
      tip: "モヤモヤはためこまず、小さいうちに共有を。安心できるルール（連絡のしかたなど）をふたりで決めると楽になります。" },
    { max: 85, ic: "🛡️", nm: "きっちり一途派", col: "#e2477c", cp: "恋人がいるなら、けじめは大事なタイプ",
      tx: "2人きりや特別あつかいはしっかり NG。まっすぐで、約束を大切にするタイプです。",
      tip: "自分もきっちり守るぶん、相手にも同じだけ求めがち。おたがいの「ふつう」がちがうこともあるので、すり合わせを。" },
    { max: 101, ic: "💘", nm: "全力ひとすじ派", col: "#d12a63", cp: "恋人以外への特別あつかいは、ほぼ全部アウト",
      tx: "愛が深いぶん、ルールもきっちり。恋人だけを見ていたい、ひとすじなタイプです。",
      tip: "相手の友だちづきあいまで全部 NG だと、おたがい息苦しくなることも。「ゆずれないもの ベスト3」を決めておくと◎" },
  ];
  const typeOf = (sc) => TYPES.find((t) => sc < t.max) || TYPES[TYPES.length - 1];

  /* ══ 保存（この端末だけ） ══ */
  const KEY = "xeva_uwaki_v1";
  let D = { a: Array(N).fill(null), self: null, at: 0 };
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || "null");
    if (o && Array.isArray(o.a) && o.a.length === N) D = Object.assign(D, o);
  } catch (e) {}
  const save = () => { D.at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} };
  const answered = () => D.a.filter((v) => v != null).length;
  const allDone = () => answered() === N && D.self != null;

  /* ══ 点数 ══ */
  function scoreOf(a) {
    const sum = a.reduce((s, v) => s + (v || 0), 0);
    return Math.round(sum / (N * 2) * 100);
  }
  function counts(a) { const c = [0, 0, 0]; a.forEach((v) => { if (v != null) c[v]++; }); return c; }
  function catStat(a, ci) {
    const vs = CATS[ci].items.map((_, k) => a[ITEMS.findIndex((it) => it.ci === ci && it.k === k)]);
    const sum = vs.reduce((s, v) => s + (v || 0), 0);
    const iya = vs.findIndex((v) => v >= 1), uw = vs.findIndex((v) => v === 2);
    return { pct: Math.round(sum / 20 * 100), vs, iya, uw };
  }

  /* ══ ① 質問の画面 ══ */
  function renderSheet() {
    let h = "";
    CATS.forEach((c, ci) => {
      h += '<section class="uw-card uw-cat" data-ci="' + ci + '"><h3><span class="cic" aria-hidden="true">' + c.ic + "</span>" + esc(c.nm) + '<small id="catN' + ci + '"></small></h3><ol class="uw-list">';
      ITEMS.filter((it) => it.ci === ci).forEach((it) => {
        const i = it.no - 1;
        h += '<li class="uw-q" data-i="' + i + '"><div class="qt"><span class="qn">' + it.no + "</span><span class=\"qx\">" + esc(it.t) + '</span></div><div class="qa" role="group" aria-label="' + esc(it.t) + '">' +
          ANS.map((a) => '<button class="abtn ' + a.cls + '" data-a="ans" data-i="' + i + '" data-v="' + a.v + '" aria-pressed="false"><span class="ad" aria-hidden="true"></span>' + a.nm + "</button>").join("") +
          "</div></li>";
      });
      h += "</ol></section>";
    });
    $("#uwQs").innerHTML = h;
    paintSheet();
  }
  function paintSheet() {
    $$(".uw-q").forEach((li) => {
      const i = +li.dataset.i, v = D.a[i];
      li.classList.toggle("done", v != null);
      li.dataset.v = v == null ? "" : v;
      $$(".abtn", li).forEach((b) => { const on = v != null && +b.dataset.v === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    });
    CATS.forEach((c, ci) => {
      const n = ITEMS.filter((it) => it.ci === ci && D.a[it.no - 1] != null).length;
      const el = $("#catN" + ci); if (el) el.textContent = n + " / " + c.items.length;
    });
    $$("#uwSelf .sbtn").forEach((b) => b.classList.toggle("on", D.self != null && +b.dataset.v === D.self));
    const n = answered(), c = counts(D.a);
    $("#pgN").textContent = n;
    $("#pgFill").style.width = (n / N * 100).toFixed(1) + "%";
    $("#pgC2").textContent = c[2]; $("#pgC1").textContent = c[1]; $("#pgC0").textContent = c[0];
    const ok = allDone(), go = $("#goRes");
    go.disabled = !ok;
    $("#goResTx").textContent = ok ? "結果を見る" : (n < N ? "あと " + (N - n) + " 問" : "さいごの質問に答えてね");
  }
  function answer(i, v) {
    const first = D.a[i] == null;
    D.a[i] = v; save(); paintSheet();
    const li = $('.uw-q[data-i="' + i + '"]');
    if (li) { li.classList.remove("pop"); void li.offsetWidth; li.classList.add("pop"); }
    /* はじめて答えたときだけ、次の未回答をそっと見える位置へ */
    if (first) {
      let nx = null;
      for (let k = i + 1; k < N; k++) if (D.a[k] == null) { nx = $('.uw-q[data-i="' + k + '"]'); break; }
      if (!nx && answered() === N && D.self == null) nx = $("#uwSelf");
      if (nx) {
        const r = nx.getBoundingClientRect();
        if (r.top > innerHeight * 0.74 || r.bottom < 90) { try { nx.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { nx.scrollIntoView(); } }
      }
    }
  }

  /* ══ ② 結果 ══ */
  const pctTag = (p) => (p < 34 ? "ゆるめ" : p < 67 ? "ふつう" : "きびしめ");
  function resultHTML(a, self, opt) {
    opt = opt || {};
    const sc = scoreOf(a), T = typeOf(sc), c = counts(a);
    let h = '<section class="uw-card uw-type" style="--tc:' + T.col + '">' +
      '<div class="rt-lb">あなたは…</div>' +
      '<div class="rt-ic" aria-hidden="true">' + T.ic + "</div>" +
      '<h2 class="rt-nm">' + esc(T.nm) + "</h2>" +
      '<p class="rt-cp">' + esc(T.cp) + "</p>" +
      '<div class="rt-meter" aria-label="浮気ライン ' + sc + ' / 100"><div class="mt-bar"><i style="left:' + sc + '%"><b>' + sc + "</b></i></div>" +
        '<div class="mt-lb"><span>ゆるい</span><span>浮気ライン</span><span>きびしい</span></div></div>' +
      '<p class="rt-tx">' + esc(T.tx) + "</p>" +
      '<div class="rt-tip"><b>💡 ひとこと</b>' + esc(T.tip) + "</div>" +
      "</section>";
    /* 3つの数 */
    h += '<section class="uw-card"><h3>仕分けの数</h3><div class="rc-stack" aria-hidden="true">' +
      [2, 1, 0].map((v) => c[v] ? '<i class="c' + v + '" style="flex:' + c[v] + '"></i>' : "").join("") + "</div>" +
      '<div class="rc-row">' + [2, 1, 0].map((v) => '<div class="rc c' + v + '"><b>' + c[v] + "</b><span>" + (v === 1 ? "浮気じゃない<wbr>けど嫌" : ANM[v]) + "</span></div>").join("") + "</div></section>";
    /* ジャンルごと */
    h += '<section class="uw-card"><h3>ジャンルごとのきびしさ</h3><div class="rg-list">' + CATS.map((ct, ci) => {
      const st = catStat(a, ci);
      const line = (k, w) => (k < 0 ? "" : "<span>" + w + "：<b>「" + esc(ct.items[k]) + "」</b>から</span>");
      const bd = st.iya < 0 ? "<span>このジャンルは<b>全部 OK</b></span>" : line(st.iya, "嫌になるのは") + line(st.uw, "浮気になるのは");
      return '<div class="rg"><div class="rg-h"><span class="cic">' + ct.ic + "</span><b>" + esc(ct.nm) + '</b><em class="t' + (st.pct < 34 ? 0 : st.pct < 67 ? 1 : 2) + '">' + pctTag(st.pct) + "</em><span class=\"rg-p\">" + st.pct + "</span></div>" +
        '<div class="rg-bar"><i style="width:' + Math.max(2, st.pct) + '%"></i></div><div class="rg-line">' + bd + "</div></div>";
    }).join("") + "</div></section>";
    /* やる側なら */
    if (self != null) h += '<section class="uw-card uw-selfr"><h3>自分がやる側なら？</h3><p><span class="sv">' + esc(SELF[self].nm) + "</span>" + SELF[self].tx + "</p></section>";
    /* 仕分け表 */
    if (!opt.noTable) {
      h += '<section class="uw-card"><h3>あなたの仕分け表</h3><div class="rs-cols">' + [2, 1, 0].map((v) => {
        const its = ITEMS.filter((it) => a[it.no - 1] === v);
        return '<div class="rs-col c' + v + '"><div class="rs-h"><span class="ad"></span>' + ANM[v] + "<em>" + its.length + "</em></div><ul>" +
          (its.length ? its.map((it) => '<li><span class="n">' + it.no + "</span>" + esc(it.t) + "</li>").join("") : '<li class="none">なし</li>') + "</ul></div>";
      }).join("") + "</div></section>";
    }
    return h;
  }
  function showResult() {
    if (!allDone()) { toast(answered() < N ? "あと " + (N - answered()) + " 問あります" : "さいごの質問に答えてね"); return; }
    const sc = scoreOf(D.a), T = typeOf(sc);
    $("#vRes").innerHTML =
      '<div class="uw-resh"><button class="uw-btn sm" data-a="toSheet"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>答えを見直す</button><span class="rh-t">結果</span></div>' +
      resultHTML(D.a, D.self) +
      '<section class="uw-card uw-acts"><h3>ふたりで比べる・シェア</h3>' +
        '<p class="uw-sub">恋人や友だちにもやってもらって、<b>コード</b>を見せ合うと、ふたりの一致度と、意見が分かれた項目がわかります。</p>' +
        '<div class="ac-row"><button class="uw-btn pri" data-a="compare"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="9" r="3.2"/><circle cx="15.5" cy="9" r="3.2"/><path d="M3.5 19c.6-3.2 2.6-5 5-5s4.4 1.8 5 5M10.5 19c.6-3.2 2.6-5 5-5s4.4 1.8 5 5"/></svg>ふたりで比べる</button>' +
        '<button class="uw-btn" data-a="copy"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11.5" height="12" rx="2.4"/><path d="M5 15.5V6.4A2.4 2.4 0 0 1 7.4 4H14"/></svg>結果の文をコピー</button>' +
        (navigator.share ? '<button class="uw-btn" data-a="share"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/></svg>共有</button>' : "") +
        "</div>" +
        '<div class="ac-row"><button class="uw-btn ghost" data-a="redoAsk"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4.5V9h-4.5"/></svg>はじめからやり直す</button></div>' +
        '<p class="uw-credit">点数は「浮気＝2・嫌＝1・OK＝0」の合計を 100点満点にしたもの。タイプはあくまでお楽しみの目安で、正解・不正解はありません。</p>' +
      "</section>";
    show("vRes");
    if (!D.seen || D.seen !== D.at) { D.seen = D.at; try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} burst(T.col); }
  }
  function shareText() {
    const sc = scoreOf(D.a), T = typeOf(sc), c = counts(D.a);
    return "これって浮気？判定シート（XEVARION）\n" + T.ic + "【" + T.nm + "】浮気ライン " + sc + "／100\n浮気 " + c[2] + "・嫌 " + c[1] + "・全然OK " + c[0] + "\nやる側なら：" + SELF[D.self].nm + "\n#これって浮気判定シート";
  }
  function copyText(t) {
    const done = () => toast("📋 コピーしました");
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(done, () => fallback()); return; }
    fallback();
    function fallback() {
      const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove(); ok ? done() : toast("コピーできませんでした");
    }
  }

  /* ══ ③ ふたりで比べる（答えを 41 けたの3進数 → 36進数のコード） ══ */
  const B3 = BigInt(3);
  function encode(a, self) {
    let x = BigInt(0);
    for (let i = N; i >= 0; i--) { const d = i === N ? self : a[i]; x = x * B3 + BigInt(d || 0); }
    const s = x.toString(36).toUpperCase().padStart(13, "0");
    return "UW1-" + s.slice(0, 4) + "-" + s.slice(4, 8) + "-" + s.slice(8);
  }
  function decode(code) {
    let s = String(code || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (s.indexOf("UW1") === 0) s = s.slice(3);
    if (!s || s.length > 14) return null;
    let x = BigInt(0);
    for (const ch of s) { const d = parseInt(ch, 36); if (isNaN(d)) return null; x = x * BigInt(36) + BigInt(d); }
    if (x >= B3 ** BigInt(N + 1)) return null;
    const a = [];
    for (let i = 0; i <= N; i++) { a.push(Number(x % B3)); x = x / B3; }
    return { a: a.slice(0, N), self: a[N] };
  }
  function openCompare(prefill) {
    const my = encode(D.a, D.self);
    const pc = prefill != null ? prefill : (D.pcode || "");
    sheet('<div class="sh-h"><b>ふたりで比べる</b><button class="uw-ibtn" data-a="close" aria-label="閉じる"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg></button></div>' +
      '<p class="uw-sub">① 自分のコードを相手に見せる（コピーして送ってもOK）<br>② 相手のコードを下に入れて「比べる」</p>' +
      '<div class="cp-my"><span>あなたのコード</span><code id="myCode">' + my + '</code><button class="uw-btn sm" data-a="copyCode">コピー</button></div>' +
      '<label class="cp-in"><span>相手のコード</span><input id="pCode" type="text" inputmode="latin" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="UW1-XXXX-XXXX-XXXXX" value="' + esc(pc) + '"></label>' +
      '<label class="cp-in"><span>相手の名前（なくてもOK）</span><input id="pName" type="text" maxlength="12" placeholder="あいて" value="' + esc(D.pname || "") + '"></label>' +
      '<div class="ac-row"><button class="uw-btn pri" data-a="doCompare">比べる</button></div><div id="cpOut"></div>');
    if (pc) doCompare(true);
  }
  function doCompare(quiet) {
    const code = $("#pCode").value.trim(), nm = ($("#pName").value || "").trim() || "あいて";
    const P = decode(code);
    if (!P) { if (!quiet) toast("コードが読めませんでした（UW1- から始まるコード）"); return; }
    D.pcode = code; D.pname = $("#pName").value.trim(); try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {}
    let same = 0, near = 0; const far = [], nears = [];
    ITEMS.forEach((it) => {
      const i = it.no - 1, d = Math.abs(D.a[i] - P.a[i]);
      if (d === 0) same++; else if (d === 1) { near++; nears.push(it); } else far.push(it);
    });
    const rate = Math.round((same + near * 0.5) / N * 100);
    const cm = rate >= 85 ? "ほぼ同じものさし！ 安心してすごせそう" : rate >= 70 ? "だいたい同じ。ちがうところだけ話しておけば◎" : rate >= 50 ? "ところどころ、ものさしがちがうみたい" : "ものさしがかなりちがうかも。ゆっくり話してみて";
    const sm = scoreOf(D.a), sp = scoreOf(P.a), Tm = typeOf(sm), Tp = typeOf(sp);
    const row = (it) => '<li><span class="n">' + it.no + "</span><span class=\"t\">" + esc(it.t) + '</span><span class="vv"><em class="c' + D.a[it.no - 1] + '">あなた：' + ANM[D.a[it.no - 1]] + '</em><em class="c' + P.a[it.no - 1] + '">' + esc(nm) + "：" + ANM[P.a[it.no - 1]] + "</em></span></li>";
    $("#cpOut").innerHTML =
      '<div class="cp-rate"><div class="cr-ring" style="--p:' + rate + '"><b>' + rate + "<small>%</small></b></div><div><b>ふたりの一致度</b><p>" + cm + "</p></div></div>" +
      '<div class="cp-two"><div style="--tc:' + Tm.col + '"><span>あなた</span><b>' + Tm.ic + " " + esc(Tm.nm) + "</b><em>浮気ライン " + sm + "</em></div>" +
      '<div style="--tc:' + Tp.col + '"><span>' + esc(nm) + "</span><b>" + Tp.ic + " " + esc(Tp.nm) + "</b><em>浮気ライン " + sp + "</em></div></div>" +
      '<div class="cp-sec"><h4>🗣 話し合ってみたい項目 <em>' + far.length + "</em></h4><p class=\"uw-sub\">片方は「浮気」、もう片方は「全然OK」</p>" +
        (far.length ? '<ul class="cp-list">' + far.map(row).join("") + "</ul>" : '<p class="none">ありません。大きくちがう項目はゼロ！</p>') + "</div>" +
      '<details class="cp-sec"><summary><h4>🤏 少しちがう項目 <em>' + nears.length + "</em></h4></summary>" +
        (nears.length ? '<ul class="cp-list">' + nears.map(row).join("") + "</ul>" : '<p class="none">ありません</p>') + "</details>" +
      '<p class="uw-sub">やる側なら：あなた「' + SELF[D.self].nm + "」・" + esc(nm) + "「" + SELF[P.self].nm + "」</p>";
    const out = $("#cpOut"); if (out && !quiet) { try { out.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) {} }
  }

  /* ══ メニュー・やり直し ══ */
  function openMenu() {
    sheet('<div class="sh-h"><b>メニュー</b><button class="uw-ibtn" data-a="close" aria-label="閉じる"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg></button></div>' +
      '<div class="mn-list">' +
      (allDone() ? '<button class="mn" data-a="resultM"><span>❤️</span><b>結果を見る</b></button><button class="mn" data-a="compareM"><span>👫</span><b>ふたりで比べる</b></button>' : "") +
      '<button class="mn" data-a="howto"><span>📖</span><b>あそびかた</b></button>' +
      '<button class="mn danger" data-a="redoAsk"><span>🔄</span><b>はじめからやり直す</b></button>' +
      '<a class="mn" href="index.html"><span>🏠</span><b>XEVARION のホームへ</b></a></div>');
  }
  function redoAsk() {
    sheet('<div class="sh-h"><b>はじめからやり直す？</b></div><p class="uw-sub">いまの答え（' + answered() + "問ぶん）は消えます。比べるために入れた相手のコードは残ります。</p>" +
      '<div class="ac-row"><button class="uw-btn danger" data-a="redo">消してやり直す</button><button class="uw-btn" data-a="close">やめる</button></div>');
  }
  function redo() {
    D.a = Array(N).fill(null); D.self = null; D.seen = 0; save();
    closeSheet(); paintSheet(); show("vSheet"); scrollTo(0, 0); toast("🔄 はじめからです");
  }
  function howto() {
    sheet('<div class="sh-h"><b>あそびかた</b><button class="uw-ibtn" data-a="close" aria-label="閉じる"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg></button></div>' +
      '<ol class="ht"><li>恋人がその行動をしていたら…と考えて、40個を <b class="c2">浮気</b>・<b class="c1">浮気じゃないけど嫌</b>・<b class="c0">全然OK</b> に仕分けます（あとから変えられます）。</li>' +
      "<li>さいごに「自分がやる側なら答えは変わる？」に答えると、<b>結果</b>が見られます。</li>" +
      "<li>結果では、浮気ライン（0〜100）とタイプ・ジャンルごとのきびしさ・境界線・仕分け表がわかります。</li>" +
      "<li>「ふたりで比べる」で自分のコードを見せ合うと、一致度と意見が分かれた項目がわかります。</li></ol>" +
      '<p class="uw-credit">答えはこの端末の中だけに保存され、どこにも送られません。</p>');
  }

  /* ══ 小物 ══ */
  function show(id) {
    $$(".uw-view").forEach((v) => v.classList.toggle("on", v.id === id));
    scrollTo(0, 0);
  }
  function sheet(html) {
    $("#uwSheet").innerHTML = html;
    const ov = $("#uwOv"); ov.classList.add("on"); ov.setAttribute("aria-hidden", "false");
  }
  function closeSheet() { const ov = $("#uwOv"); ov.classList.remove("on"); ov.setAttribute("aria-hidden", "true"); }
  let tT = 0;
  function toast(t, ms) {
    const el = $("#uwToast"); el.innerHTML = t; el.classList.add("on");
    clearTimeout(tT); tT = setTimeout(() => el.classList.remove("on"), ms || 1900);
  }
  function burst(col) {
    if (matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fx = document.createElement("div"); fx.className = "uw-fx";
    let h = "";
    for (let i = 0; i < 18; i++) h += '<i style="left:' + (8 + Math.random() * 84).toFixed(1) + "%;--d:" + (Math.random() * 0.5).toFixed(2) + "s;--x:" + ((Math.random() - 0.5) * 90).toFixed(0) + "px;--c:" + (i % 3 ? col : "#ff8fb1") + '">' + (i % 4 ? "❤" : "♡") + "</i>";
    fx.innerHTML = h; document.body.appendChild(fx);
    setTimeout(() => fx.remove(), 2600);
  }

  /* ══ 操作 ══ */
  const ACT = {
    ans: (b) => answer(+b.dataset.i, +b.dataset.v),
    self: (b) => { D.self = +b.dataset.v; save(); paintSheet(); const g = $("#goRes"); if (allDone() && g) { try { g.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {} } },
    result: () => showResult(),
    resultM: () => { closeSheet(); showResult(); },
    toSheet: () => show("vSheet"),
    compare: () => openCompare(),
    compareM: () => { openCompare(); },
    doCompare: () => doCompare(false),
    copyCode: () => copyText($("#myCode").textContent),
    copy: () => copyText(shareText()),
    share: () => { try { navigator.share({ text: shareText() }).catch(() => {}); } catch (e) { copyText(shareText()); } },
    menu: () => openMenu(),
    howto: () => howto(),
    redoAsk: () => redoAsk(),
    redo: () => redo(),
    close: () => closeSheet(),
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]");
    if (!b || b.disabled) return;
    const f = ACT[b.dataset.a]; if (!f) return;
    e.preventDefault(); f(b);
  });
  $("#uwOv").addEventListener("click", (e) => { if (e.target.id === "uwOv") closeSheet(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
    if (e.key === "Enter" && e.target && e.target.id === "pCode") doCompare(false);
  });

  renderSheet();
  /* 前に全部答えていたら、そのまま結果へ（「答えを見直す」で質問に戻れる） */
  if (allDone()) showResult();
  window.UwakiSheet = { encode, decode, score: () => scoreOf(D.a), state: () => D };
})();
