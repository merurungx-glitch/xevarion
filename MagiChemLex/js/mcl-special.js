/* ============================================================
   MagiChemLex — mcl-special.js（特設予想問題）★★ 2026-10-15 新規
   ------------------------------------------------------------
   ご指定「特設予想問題として、最近 東大の総長選出で言われている 553＞1107 の不等式を証明せよ、という問題を
   たくさんの解法と共に。それぞれの解法はあくまで事実とは無関係であるかもしれないことを表記（藤垣の最終定理）。
   ニュースや図やグラフを使用しても構わない」
   ★ ユーザーは「533」と書いていたが、報道された得票は 553 票（1位は 1,107 票）。SNS で話題の式も「553＞1107」。
   ★ この特設ページだけは、ご指定どおり大学名・人名を出す（MagiChemLex のほかの画面は固有名詞を出さない決まりのまま）。
     出すのは報道された事実（得票・選考の仕組み・選考理由の要旨・要望書）だけ。解法はすべて「ネタ」と明記し、人を評価・批判しない。
     ほかの候補者の名前は出さない（「1位の候補」）。
   ・ホームのバナー（bannerHTML）→ 全画面のページ（#mclSp）。演習の記録・ごほうびには関わらない（確認テストもこの中だけ）。
   ============================================================ */
(function () {
  "use strict";
  const M = window.MCL, U = window.MCLUI;
  if (!M || !U) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = M.esc, ic = U.ic;
  const SEEN = "mcl_sp553_seen";
  /* ★★ 2026-10-15 ご指定「確認テストを行った初回で 1660 XEVA を、正解・不正解に関係なく配布」（1660 = 553 + 1107）
     印は MagiChemLex の記録の rw["sp553quiz"]（アカウントで同期・学習の記録のリセットでも消えない）＝1回だけ。
     ほかのごほうびとちがい、イベントの倍率はかけない（ちょうど 1660）。理由の頭は「MagiChemLex」（ミッションが数える） */
  const QZ_MARK = "sp553quiz", QZ_XEVA = 1660;
  const qzGot = () => { try { return !!(M.get().rw || {})[QZ_MARK]; } catch (e) { return false; } };
  function qzReward() {
    let first = 0;
    try { first = M.mut((s) => { s.rw = s.rw || {}; if (s.rw[QZ_MARK]) return 0; s.rw[QZ_MARK] = Date.now(); return 1; }); } catch (e) { first = 0; }
    if (!first) return 0;
    try { if (window.XEVA) XEVA.add(QZ_XEVA, "MagiChemLex 特設予想問題「553＞1107」確認テスト（はじめて）"); } catch (e) {}
    return QZ_XEVA;
  }

  /* ══ 検算（その場で計算して見せる） ══ */
  const dsum = (n) => String(n).split("").reduce((s, c) => s + +c, 0);
  const dprod = (n) => String(n).split("").reduce((s, c) => s * +c, 1);
  function factor(n) { const f = []; for (let p = 2; p * p <= n; p++) while (n % p === 0) { f.push(p); n /= p; } if (n > 1) f.push(n); return f; }
  const vp = (n, p) => { let k = 0; while (n % p === 0) { n /= p; k++; } return k; };
  const fstr = (n) => { const f = factor(n), c = {}; f.forEach((p) => { c[p] = (c[p] || 0) + 1; }); return Object.keys(c).map((p) => p + (c[p] > 1 ? "<sup>" + c[p] + "</sup>" : "")).join(" × "); };
  const i11 = (x) => (x << 21) >> 21;              /* 11ビットの符号付き整数に入れたときの値 */
  const eV = (nm) => 1239.84 / nm;                  /* 光子1個のエネルギー（eV）＝ hc / λ */

  /* ══ 図・グラフ（SVG） ══ */
  function voteSVG() {
    const rows = [["1位の候補", 1107, "#8b93b7"], ["藤垣 教授", 553, "#ff4f86"], ["3位の候補", 451, "#b9c0dc"], ["白票", 58, "#d9deef"]];
    const W = 340, L = 74, max = 1200, bw = (v) => (v / max) * (W - L - 44);
    let y = 10, h = "";
    rows.forEach((r) => {
      h += '<text class="tx" x="' + (L - 8) + '" y="' + (y + 15) + '" text-anchor="end">' + r[0] + "</text>";
      if (r[1] === 553) {
        /* 553 を2つ並べると 1,106（あと1票で 1,107）＝点線のわく */
        h += '<rect x="' + (L + bw(553)).toFixed(1) + '" y="' + (y + 1) + '" width="' + bw(553).toFixed(1) + '" height="20" rx="6" style="fill:none;stroke:#ff4f86;stroke-width:1.6;stroke-dasharray:4 3"/>' +
          '<text class="tx s" x="' + (L + bw(553) * 1.5).toFixed(1) + '" y="' + (y + 15) + '" text-anchor="middle" style="fill:#ff4f86">×2 = 1,106</text>';
      }
      h += '<rect x="' + L + '" y="' + y + '" width="' + bw(r[1]).toFixed(1) + '" height="22" rx="6" style="fill:' + r[2] + '"/>' +
        (r[1] === 553 ? '<text class="tx b" x="' + (L + bw(553) - 6).toFixed(1) + '" y="' + (y + 16) + '" text-anchor="end" style="fill:#fff">553</text>'
          : '<text class="tx b" x="' + (L + bw(r[1]) + 6).toFixed(1) + '" y="' + (y + 16) + '">' + r[1].toLocaleString() + "</text>");
      y += 32;
    });
    h += '<text class="tx s" x="' + (W / 2) + '" y="' + (y + 6) + '" text-anchor="middle">1,107 = 553 × 2 + 1（ちょうど「ダブルスコア」＋1票）</text>';
    return '<svg class="sp-svg" viewBox="0 0 ' + W + " " + (y + 14) + '" role="img" aria-label="意向投票（第2回）の得票">' + h + "</svg>";
  }
  function lineSVG() {
    const W = 340, x = (v) => 20 + (v / 1200) * 300;
    return '<svg class="sp-svg" viewBox="0 0 ' + W + ' 64" role="img" aria-label="数直線">' +
      '<path d="M14 34 H330" class="ln"/><path d="M324 29 L332 34 L324 39" class="ln"/>' +
      [0, 553, 1107].map((v) => '<path d="M' + x(v) + " 28 V40\" class=\"ln\"/><text class=\"tx b\" x=\"" + x(v) + '" y="56" text-anchor="middle">' + v + "</text>").join("") +
      '<circle cx="' + x(553) + '" cy="34" r="6" style="fill:#ff4f86"/><circle cx="' + x(1107) + '" cy="34" r="6" style="fill:#8b93b7"/>' +
      '<text class="tx s" x="' + x(830) + '" y="20" text-anchor="middle">ふつうは 553 ＜ 1107</text></svg>';
  }
  function specSVG() {
    const W = 340, x = (nm) => 14 + ((nm - 350) / (1200 - 350)) * 312;
    let stops = "";
    [[380, "#7a00ff"], [440, "#2f3bff"], [490, "#00b7ff"], [530, "#2bd34a"], [570, "#e8e52a"], [600, "#ff9b1f"], [650, "#ff2a1f"], [700, "#c40000"], [780, "#3a0000"]].forEach((s) => {
      stops += '<stop offset="' + ((s[0] - 380) / 400).toFixed(3) + '" stop-color="' + s[1] + '"/>';
    });
    return '<svg class="sp-svg" viewBox="0 0 ' + W + ' 96" role="img" aria-label="光の波長">' +
      '<defs><linearGradient id="spVis" x1="0" x2="1">' + stops + "</linearGradient>" +
      '<linearGradient id="spIr" x1="0" x2="1"><stop offset="0" stop-color="#5a1020"/><stop offset="1" stop-color="#2a2f45"/></linearGradient></defs>' +
      '<rect x="' + x(380) + '" y="26" width="' + (x(780) - x(380)).toFixed(1) + '" height="20" rx="4" fill="url(#spVis)"/>' +
      '<rect x="' + x(780) + '" y="26" width="' + (x(1200) - x(780)).toFixed(1) + '" height="20" rx="4" fill="url(#spIr)" opacity=".85"/>' +
      '<text class="tx s" x="' + x(580) + '" y="18" text-anchor="middle">目に見える光</text><text class="tx s" x="' + x(990) + '" y="18" text-anchor="middle">近赤外線（見えない）</text>' +
      [[553, "#ff4f86", "553 nm"], [1107, "#8b93b7", "1107 nm"]].map((m) => '<path d="M' + x(m[0]).toFixed(1) + " 22 V54\" style=\"stroke:" + m[1] + ';stroke-width:3"/><text class="tx b" x="' + x(m[0]).toFixed(1) + '" y="68" text-anchor="middle">' + m[2] + "</text>").join("") +
      '<text class="tx s" x="' + x(553).toFixed(1) + '" y="86" text-anchor="middle">' + eV(553).toFixed(2) + ' eV</text><text class="tx s" x="' + Math.min(x(1107), 326).toFixed(1) + '" y="86" text-anchor="end">' + eV(1107).toFixed(2) + " eV（≈ Si のバンドギャップ）</text></svg>";
  }
  function lumSVG() {
    const W = 340, H = 110, x = (nm) => 20 + ((nm - 350) / (1150 - 350)) * 300, y = (v) => 90 - v * 70;
    let d = "";
    for (let nm = 380; nm <= 780; nm += 5) { const v = Math.min(1, 1.019 * Math.exp(-285.4 * Math.pow(nm / 1000 - 0.559, 2))); d += (nm === 380 ? "M" : "L") + x(nm).toFixed(1) + " " + y(v).toFixed(1); }
    return '<svg class="sp-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="目の感じやすさ">' +
      '<path d="M20 90 H330" class="ln"/><path d="M20 90 V14" class="ln"/>' +
      '<path d="' + d + '" style="fill:none;stroke:#2bb36a;stroke-width:3"/>' +
      '<path d="M' + x(780).toFixed(1) + " 90 H" + x(1150).toFixed(1) + '" style="stroke:#2bb36a;stroke-width:3;stroke-dasharray:4 4"/>' +
      '<circle cx="' + x(553).toFixed(1) + '" cy="' + y(0.998).toFixed(1) + '" r="5" style="fill:#ff4f86"/><circle cx="' + x(1107).toFixed(1) + '" cy="90" r="5" style="fill:#8b93b7"/>' +
      '<text class="tx b hl" x="' + (x(553) + 10).toFixed(1) + '" y="' + (y(0.998) + 4).toFixed(1) + '">553 nm：ほぼ 1（最大）</text>' +
      '<text class="tx b hl" x="' + (x(1107) - 4).toFixed(1) + '" y="80" text-anchor="end">1107 nm：0</text>' +
      '<text class="tx s" x="24" y="12">明るさの感じやすさ（明所視の視感度）</text><text class="tx s" x="326" y="104" text-anchor="end">波長 / nm</text></svg>';
  }

  /* ══ 解法 ══
     ok … true＝その「ものさし」では成り立つ／false＝やってみたけれど成り立たない（正直に書く） */
  const SOLS = [
    { cat: "info", nm: "辞書式順序（文字として比べる）", ok: true,
      b: "数を<b>文字列</b>として比べると、1文字目どうしを先に比べます。「5」と「1」では「5」が後ろ（大きい）なので、残りを見るまでもなく <b>\"553\" ＞ \"1107\"</b>。ファイル名を「名前順」に並べたとき 1107 が 553 より前に来るのと同じです。",
      chk: () => ['"553" > "1107"', String("553" > "1107")] },
    { cat: "math", nm: "各位の和", ok: true,
      b: "5 + 5 + 3 = <b>" + dsum(553) + "</b>、1 + 1 + 0 + 7 = <b>" + dsum(1107) + "</b>。各位の数の和で比べると " + dsum(553) + " ＞ " + dsum(1107) + "。",
      chk: () => ["各位の和", dsum(553) + " ＞ " + dsum(1107)] },
    { cat: "math", nm: "各位の積", ok: true,
      b: "5 × 5 × 3 = <b>" + dprod(553) + "</b>、1 × 1 × 0 × 7 = <b>" + dprod(1107) + "</b>。1107 には 0 の位があるので、かけ算では一気に 0 になります。",
      chk: () => ["各位の積", dprod(553) + " ＞ " + dprod(1107)] },
    { cat: "math", nm: "いちばん大きい素因数", ok: true,
      b: "素因数分解すると 553 = " + fstr(553) + "、1107 = " + fstr(1107) + "。いちばん大きい素因数で比べると <b>79 ＞ 41</b>。素因数の和（7+79 = 86 と 3+3+3+41 = 50）でも 553 の勝ちです。",
      chk: () => ["最大の素因数", Math.max.apply(null, factor(553)) + " ＞ " + Math.max.apply(null, factor(1107))] },
    { cat: "math", nm: "3進の世界の「大きさ」（p進絶対値）", ok: true,
      b: "素数 p で何回割り切れるかを v<sub>p</sub>(x) とし、|x|<sub>p</sub> = p<sup>−v<sub>p</sub>(x)</sup> で「大きさ」を測る方法（p進絶対値）があります。p = 3 なら 553 は 3 で割り切れない（v<sub>3</sub> = " + vp(553, 3) + "）ので |553|<sub>3</sub> = 1、1107 = 3<sup>3</sup> × 41（v<sub>3</sub> = " + vp(1107, 3) + "）なので |1107|<sub>3</sub> = 1/27。よって <b>|553|<sub>3</sub> ＞ |1107|<sub>3</sub></b>（p = 41 でも同じ）。大学の数学では、この「大きさ」も立派な大きさです。",
      chk: () => ["|553|₃ と |1107|₃", "1 ＞ 1/" + Math.pow(3, vp(1107, 3))] },
    { cat: "math", nm: "逆数（へる関数で測る）", ok: true,
      b: "f(x) = 1/x のように、x が大きいほど小さくなる関数（単調減少関数）で測れば、<b>f(553) ＞ f(1107)</b>。1/553 ≈ 0.00181、1/1107 ≈ 0.00090。「1票あたりの重み（1 ÷ 票数）」で比べた、と考えることもできます。",
      chk: () => ["1/553 と 1/1107", (1 / 553).toFixed(5) + " ＞ " + (1 / 1107).toFixed(5)] },
    { cat: "math", nm: "マイナスをつける（減点方式）", ok: true,
      b: "両辺に −1 をかけると不等号の向きが変わります。<b>−553 ＞ −1107</b>。点数を「減点」で数える世界では、小さいほうが上です。",
      chk: () => ["-553 > -1107", String(-553 > -1107)] },
    { cat: "math", nm: "角度として読む（360°で一回り）", ok: true,
      b: "553° と 1107° を角度とみると、360° で一回りなので 553° は <b>" + (553 % 360) + "°</b>、1107° は <b>" + (1107 % 360) + "°</b> と同じ向き。向きの角度では " + (553 % 360) + "° ＞ " + (1107 % 360) + "°。下3けた（1000 で割った余り）で比べても 553 ＞ 107 です。",
      chk: () => ["553 mod 360 と 1107 mod 360", (553 % 360) + " ＞ " + (1107 % 360)] },
    { cat: "info", nm: "11ビットにおさめる（オーバーフロー）", ok: true,
      b: "11ビットの符号つき整数は −1024〜1023 までしか入りません。1107 を入れるとあふれて <b>1107 − 2048 = " + i11(1107) + "</b> に化けます（553 はそのまま 553）。コンピュータの中では <b>553 ＞ " + i11(1107) + "</b>。",
      chk: () => ["(1107 << 21) >> 21", String(i11(1107))] },
    { cat: "info", nm: "シェルで書いてみる", ok: true,
      b: "bash で <code>[ 553 &gt; 1107 ] &amp;&amp; echo 成立</code> と打つと「成立」と出ます。じつは [ ] の中の &gt; は「大なり」ではなく<b>出力先の指定（リダイレクト）</b>として読まれ、「553 という文字は空ではない？」を調べているだけ（そして 1107 という名前の空ファイルができる）。数を比べるときは -gt を使いましょう。",
      term: "$ [ 553 > 1107 ] && echo 成立\n成立\n$ ls\n1107", chk: null },
    { cat: "chem", nm: "光子のエネルギー（化学・物理）", ok: true, fig: specSVG,
      b: "553 と 1107 を光の波長（nm）とみます。光子1個のエネルギーは E = hc/λ（波長が短いほど大きい）なので、E(553 nm) ≈ <b>" + eV(553).toFixed(2) + " eV</b>、E(1107 nm) ≈ <b>" + eV(1107).toFixed(2) + " eV</b>。しかも比はちょうど約 <b>" + (eV(553) / eV(1107)).toFixed(2) + " 倍</b>──ダブルスコアがそのままひっくり返ります。ちなみに 1.12 eV はケイ素（Si）のバンドギャップとほぼ同じで、1107 nm より長い光はケイ素の太陽電池ではほとんど電気になりません。",
      chk: () => ["E(553nm) / E(1107nm)", (eV(553) / eV(1107)).toFixed(3)] },
    { cat: "chem", nm: "見える明るさ（視感度）", ok: true, fig: lumSVG,
      b: "人の目は 555 nm 付近の緑の光をいちばん明るく感じます（明所視の視感度のピーク）。553 nm はほぼピーク、1107 nm は目に見えない近赤外線で視感度は 0。同じ強さの光なら「見える明るさ」は <b>553 ≫ 1107</b>。",
      chk: () => ["視感度 V(553) と V(1107)", "≈ 1 ＞ 0"] },
    { cat: "chem", nm: "単位をそろえない", ok: true,
      b: "553 kcal と 1107 kJ を比べると、1 kcal = 4.184 kJ なので 553 kcal ≈ <b>" + Math.round(553 * 4.184).toLocaleString() + " kJ</b> ＞ 1107 kJ。化学の計算で単位を書かないと、こういうことが起きます（よい子はまねしない）。",
      chk: () => ["553 × 4.184", (553 * 4.184).toFixed(1) + " kJ ＞ 1107 kJ"] },
    { cat: "chem", nm: "物質量で比べる", ok: true,
      b: "553 g の水素 {H2}（モル質量 2.0 g/mol）は 553 ÷ 2.0 ≈ <b>" + (553 / 2).toFixed(1) + " mol</b>、1107 g の二酸化炭素 {CO2}（44 g/mol）は 1107 ÷ 44 ≈ <b>" + (1107 / 44).toFixed(1) + " mol</b>。質量では負けていても、粒の数（物質量）では 553 の圧勝です。",
      chk: () => ["n(H₂) と n(CO₂)", (553 / 2).toFixed(1) + " mol ＞ " + (1107 / 44).toFixed(1) + " mol"] },
    { cat: "chem", nm: "元素記号で読む（失敗）", ok: false,
      b: "1107 を「11」と「7」に分けて原子番号とみると、11番 ナトリウム <b>Na</b> と 7番 窒素 <b>N</b> で「<b>NaN</b>」（Not a Number＝数ではない）。数ではないものとは大小が比べられないので 553 が残る……と思いきや、JavaScript では <code>553 &gt; NaN</code> も <b>false</b>。NaN とは何をくらべても false です。この解法は不成立。",
      chk: () => ["553 > NaN", String(553 > NaN)] },
    { cat: "life", nm: "少ないほうが勝ちの競技", ok: true,
      b: "ゴルフのスコアや、陸上・水泳のタイム、レースの順位は<b>小さいほうが勝ち</b>。「勝ち」を ＞ で書く約束なら、553 ＞ 1107 です。",
      chk: null },
    { cat: "life", nm: "投票のしかたを変えてみる（失敗）", ok: false,
      b: "多数決のほかにも、順位をつけて点数化する方法（ボルダ式）や、1対1の勝ち負けで決める方法（コンドルセ式）などがあり、方法によって1位が入れかわることもあります。ところが今回の 1,107 票は全体の約 51%（白票をのぞくと約 52%）と<b>過半数</b>。過半数を取った人は、ふつうの方式ではやはり勝ちます。この解法は不成立。",
      chk: () => ["1107 / 2169", (1107 / 2169 * 100).toFixed(1) + "%（過半数）"] },
    { cat: "life", nm: "しくみで読む（報道された事実）", ok: true,
      b: "東京大学の総長選考では、学内の意向投票は<b>参考のひとつ</b>で、最終的には総長選考・監察会議が、面接や所信表明などもふまえて決めます（報道による）。つまり「得票数」と「選ばれること」は<b>別のものさし</b>。会議の判断というものさしで読むと 553 ＞ 1107 になった、というのが報道された結果です。一方で、どう比べて結論に至ったのかの説明を求める声もあがっています。",
      chk: null },
  ];
  const CAT = { math: "数学", chem: "化学", info: "情報", life: "くらし・しくみ" };

  /* ══ 確認テスト（この中だけ・ごほうびなし） ══ */
  const QZ = [
    { q: "文字列として（辞書式順序で）くらべたとき、大きいのはどっち？", o: ["\"553\"", "\"1107\"", "同じ"], a: 0, s: "1文字目どうしで「5」＞「1」なので \"553\" のほうが大きい。" },
    { q: "波長 553 nm と 1107 nm の光子1個のエネルギーの比 E(553)/E(1107) はおよそいくつ？", o: ["0.5", "1", "2", "4"], a: 2, s: "E = hc/λ なので比は 1107/553 ≈ 2.0。波長が半分ならエネルギーは2倍。" },
    { q: "3進絶対値 |1107|₃ はいくつ？", o: ["1", "1/3", "1/9", "1/27"], a: 3, s: "1107 = 3³ × 41 なので |1107|₃ = 3⁻³ = 1/27。" },
    { q: "1107 を「11」と「7」に分けて原子番号とみると、元素記号を並べた文字は？", o: ["NaN", "NaO", "NeN", "MgN"], a: 0, s: "11番 Na（ナトリウム）・7番 N（窒素）で NaN。" },
    { q: "553 g の H₂ と 1107 g の CO₂。物質量が大きいのは？（H=1.0, C=12, O=16）", o: ["H₂", "CO₂", "同じ"], a: 0, s: "H₂ は 553/2.0 ≈ 277 mol、CO₂ は 1107/44 ≈ 25 mol。" },
  ];
  let QA = {};

  function solHTML(s, i) {
    let chk = "";
    if (s.chk) { const r = s.chk(); chk = '<div class="ss-chk"><span>' + ic("check") + "検算</span><code>" + esc(r[0]) + "</code><b>→ " + esc(r[1]) + "</b></div>"; }
    return '<article class="sp-sol' + (s.ok ? "" : " ng") + '" data-cat="' + s.cat + '" style="--d:' + (i * 0.03).toFixed(2) + 's">' +
      '<div class="ss-h"><span class="ss-n">解法 ' + (i + 1) + '</span><span class="ss-cat ' + s.cat + '">' + CAT[s.cat] + "</span>" + (s.ok ? "" : '<span class="ss-ng">不成立</span>') + "</div>" +
      "<h3>" + esc(s.nm) + "</h3>" +
      '<div class="ss-b">' + M.fmt(s.b) + "</div>" +
      (s.fig ? '<div class="sp-fig">' + s.fig() + "</div>" : "") +
      (s.term ? '<pre class="ss-term">' + esc(s.term) + "</pre>" : "") + chk +
      '<div class="ss-end">' + (s.ok ? '<span class="qed">∎ Q.E.D.（このものさしでは）</span>' : '<span class="qed ng">✗ この解法では証明できません</span>') + "</div>" +
      '<p class="ss-dis">⚠ この解法はネタです。実際の選考の理由や事実とは無関係かもしれません。</p></article>';
  }
  function quizHTML() {
    const done = Object.keys(QA).length, ok = Object.keys(QA).filter((k) => QA[k] === QZ[k].a).length;
    const got = qzGot();
    return '<section class="sp-card sp-quiz" id="spQuiz"><h2 class="sp-h">' + ic("exam") + "確認テスト<small>習得の記録には関わりません</small></h2>" +
      '<p class="qz-gift' + (got ? " got" : "") + '">' + ic("gift") + (got ? "<span><b>" + QZ_XEVA.toLocaleString() + " XEVA</b> は受け取りずみです（もう一度解けます）</span>" : "<span>はじめて最後まで解くと <b>" + QZ_XEVA.toLocaleString() + " XEVA</b>（553＋1107）！ 正解の数に関係なく、1回だけもらえます</span>") + "</p>" +
      QZ.map((z, i) => {
        const a = QA[i];
        return '<div class="qz' + (a != null ? " done" : "") + '"><p><b>Q' + (i + 1) + ".</b> " + M.fmt(z.q) + '</p><div class="qz-o">' + z.o.map((o, k) =>
          '<button class="qz-b' + (a != null && k === z.a ? " cor" : "") + (a === k && k !== z.a ? " ng" : "") + '" data-a="spQz" data-i="' + i + '" data-k="' + k + '"' + (a != null ? " disabled" : "") + ">" + M.fmt(o) + "</button>").join("") + "</div>" +
          (a != null ? '<p class="qz-s">' + (a === z.a ? "⭕ 正解！ " : "❌ ざんねん。 ") + M.fmt(z.s) + "</p>" : "") + "</div>";
      }).join("") +
      (done === QZ.length ? '<div class="qz-res"><b>' + ok + " / " + QZ.length + "</b> 問正解" + (ok === QZ.length ? "！ あなたも「最終定理」の証明者です 🎓" : "") + '<button class="btn sm" data-a="spQzReset">' + ic("undo") + "もう一度</button></div>" : "") +
      "</section>";
  }
  function pageHTML() {
    const okN = SOLS.filter((s) => s.ok).length;
    return '<div class="sp-top"><button class="sp-back" data-a="spClose">' + ic("chevL") + '<span>もどる</span></button><b>特設予想問題</b><span class="sp-badge">NEW</span></div>' +
      '<div class="sp-scroll" id="spScroll"><div class="sp-wrap">' +
      '<header class="sp-hero"><div class="sp-tags"><span class="t1">' + ic("news") + "特設予想問題</span><span class=\"t2\">ニュースから</span></div>" +
        '<h1><span class="ineq">553 <i>＞</i> 1107</span><span class="wo">を証明せよ。</span></h1>' +
        '<p class="sub">── 藤垣の最終定理</p>' +
        '<div class="sp-warn"><b>⚠ これはニュースをもとにしたネタ問題です</b>下の解法は数学・化学・情報の「ものさし」の遊びで、<b>実際の選考の理由や事実とは無関係かもしれません</b>。特定の人や団体を評価したり、批判したりするものではありません。</div></header>' +
      '<section class="sp-card"><h2 class="sp-h">' + ic("help") + "問題</h2>" +
        '<p class="sp-qt"><b>553 ＞ 1107</b> を証明せよ。</p>' +
        '<div class="sp-fig">' + lineSVG() + "</div>" +
        "<p>ふつうの数の大小では 553 ＜ 1107（1107 は 553 の<b>ちょうど2倍＋1</b>）。では、どんな「ものさし」なら 553 のほうが大きくなるでしょう？</p>" +
        '<div class="sp-thm"><b>定理（藤垣の最終定理）</b>うまい「ものさし」 f をえらべば、<b>f(553) ＞ f(1107)</b> が成り立つ。</div>' +
        '<p class="sp-note">※ ネットでは「533 ＞ 1107」と書かれることもありますが、報道された得票は <b>553 票</b>です。</p></section>' +
      '<section class="sp-card sp-news"><h2 class="sp-h">' + ic("news") + "ニュース（報道された事実の整理）</h2>" +
        "<ul>" +
        "<li>2026年9月、東京大学の次の総長を決める学内の<b>意向投票</b>（上位3人による第2回）で、1位の候補が <b>1,107票</b>（約51%）、<b>藤垣裕子 教授</b>が <b>553票</b>（約25.5%）、3位の候補が 451票（白票58・計2,169票）。</li>" +
        "<li>9月28日、<b>総長選考・監察会議</b>は、面接や所信表明などもふまえて藤垣教授を次期総長予定者に選びました。女性の総長は初めてで、2027年4月に就任する予定です。</li>" +
        "<li>意向投票は選考の参考のひとつで、最終的には会議が決める仕組み。意向投票の1位の人が選ばれなかったのは初めてとされます。</li>" +
        "<li>会議は選考の理由として、科学技術を社会に伝える力や、学術への信頼を回復する意志と能力、分断を乗り越える力などをあげました。</li>" +
        "<li>10月13日、教職員の有志（賛同 523人）が、意向投票をどう考慮し、どう比べて結論に至ったのか説明を求める要望書を会議に提出しました。</li>" +
        "<li>SNS では「553 ＞ 1107」という<b>不等式</b>が話題になりました。</li></ul>" +
        '<div class="sp-fig"><p class="cap">意向投票（第2回）の得票</p>' + voteSVG() + "</div>" +
        '<p class="sp-src">出典：報道（2026年9月28日〜10月14日）。<a href="https://news.yahoo.co.jp/articles/37361ad1d948e441b8f6b35a343846532e762b8f" target="_blank" rel="noopener">高校生新聞（Yahoo!ニュース）</a>・<a href="https://resemom.jp/article/2026/10/14/87875.html" target="_blank" rel="noopener">リセマム</a> ほか。数字は報道によります。</p></section>' +
      '<h2 class="sp-h2">解法 ' + SOLS.length + ' 通り<small>成り立つ ' + okN + "・不成立 " + (SOLS.length - okN) + "</small></h2>" +
      '<div class="sp-flt">' + [["all", "すべて"]].concat(Object.keys(CAT).map((k) => [k, CAT[k]])).map((p, i) => '<button class="spf' + (i ? "" : " on") + '" data-a="spFlt" data-v="' + p[0] + '">' + p[1] + "</button>").join("") + "</div>" +
      '<div class="sp-sols" id="spSols">' + SOLS.map(solHTML).join("") + "</div>" +
      quizHTML() +
      '<section class="sp-card sp-end"><p class="fermat">「私はこの不等式の真に驚くべき証明を見つけたが、この余白はそれを書くには狭すぎる。」</p>' +
        "<p>──と書きのこしたのはフェルマー（の最終定理）ですが、こちらは余白の広いアプリなので " + SOLS.length + " 通り書いておきました。</p>" +
        '<p class="sp-dis">※ 解法はすべて、ものさしを変えて遊ぶための<b>ネタ</b>です。実際の選考の理由・経緯や、関わった人の考えとは<b>無関係かもしれません</b>。事実関係は報道や大学の発表で確かめてください。</p>' +
        '<button class="btn" data-a="spClose">' + ic("chevL") + "MagiChemLex にもどる</button></section>" +
      "</div></div>";
  }

  /* ══ 開く・閉じる ══ */
  function open() {
    let el = $("#mclSp");
    if (!el) { el = document.createElement("div"); el.id = "mclSp"; el.className = "mcl-sp"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "特設予想問題"); document.body.appendChild(el); }
    el.innerHTML = pageHTML();
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("on"));
    document.body.classList.add("sp-open");
    try { localStorage.setItem(SEEN, "1"); } catch (e) {}
    const b = $(".spb"); if (b) b.classList.add("seen");
  }
  function close() {
    const el = $("#mclSp"); if (!el) return;
    el.classList.remove("on"); document.body.classList.remove("sp-open");
    setTimeout(() => { if (!el.classList.contains("on")) { el.hidden = true; el.innerHTML = ""; } }, 260);
  }
  function bannerHTML() {
    let seen = false; try { seen = localStorage.getItem(SEEN) === "1"; } catch (e) {}
    return '<button class="spb' + (seen ? " seen" : "") + '" data-a="spOpen"><span class="spb-ic">' + ic("news") + '</span><span class="spb-t"><small>特設予想問題<i>NEW</i></small><b>553 ＞ 1107 を証明せよ</b><em>藤垣の最終定理 ── 解法' + SOLS.length + "通り・" + (qzGot() ? "ニュースとグラフつき" : "確認テストで " + QZ_XEVA.toLocaleString() + " XEVA") + "</em></span>" + ic("chevR") + "</button>";
  }

  const A = U.act;
  A.spOpen = () => open();
  A.spClose = () => close();
  A.spFlt = (el) => {
    const v = el.dataset.v;
    $$("#mclSp .spf").forEach((b) => b.classList.toggle("on", b === el));
    $$("#spSols .sp-sol").forEach((s) => { s.hidden = !(v === "all" || s.dataset.cat === v); });
  };
  A.spQz = (el) => {
    const i = +el.dataset.i, k = +el.dataset.k; if (QA[i] != null) return;
    QA[i] = k; if (k === QZ[i].a) U.SFX.ok(); else U.SFX.ng();
    const all = Object.keys(QA).length === QZ.length;
    const amt = all ? qzReward() : 0;
    const box = $("#spQuiz"); if (box) box.outerHTML = quizHTML();
    if (amt) { setTimeout(() => { U.toast("🎁 <b>" + amt.toLocaleString() + " XEVA</b> を受け取りました！（553＋1107）", "gold"); U.SFX.done(); U.confetti(34); }, 250); }
    else if (all && Object.keys(QA).every((x) => QA[x] === QZ[x].a)) U.confetti(28);
  };
  A.spQzReset = () => { QA = {}; const box = $("#spQuiz"); if (box) box.outerHTML = quizHTML(); };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("sp-open") && !U.sheetOpen()) close(); });

  window.MCLSpecial = { open, close, bannerHTML };
  /* 読みこみの順番で、ホームがこのファイルより先に描かれていたら描き直す（バナーを出す） */
  if (document.readyState !== "loading" && U.tab === "home" && !document.querySelector(".spb")) { try { U.go("home", true); } catch (e) {} }
})();
