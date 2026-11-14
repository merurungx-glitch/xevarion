/* ============================================================
   MagiChemLex — mcl-route.js（ケミカル・ルート＝反応経路スコアアタック）★★ 2026-11-13 新規
   ------------------------------------------------------------
   ご指定「反応経路図の問題を、スコアアタックのレトロミニゲーム風に出題する形式で、ホームのビンゴの真下に追加」
          「問題は図の 1〜23 全てと、その間の加える物質もすべて答えさせる。アニメーションや図などは任せる」
   ・ベンゼンから出発する反応経路図（2枚ぶん）を1枚の「地図」にして、
       矢印（加えるもの・条件）27本 ＋ 化合物 23個 ＝ 全50問 を、8つのステージで順に答える。
     答えるたびに地図の「？」が構造式と試薬に変わり、案内役のドット絵が次の化合物へ跳ぶ。
   ・★★ 各ステージは2ラウンド（ご指摘「矢印で加えるものは、次の結果がわからないと答えられない」）：
       ROUND 1＝矢印の試薬・条件は<b>見えている</b>（もとの図と同じ）→ できる<b>化合物</b>を答える。
       ROUND 2＝化合物が全部見えたところで、そのステージの矢印の文字を<b>かくして</b> → <b>加えるもの・条件</b>を答える。
     どの問題も「出発の化合物・行き先の化合物・矢印」のうち2つが見えていて、のこり1つを答える形にしてある。
   ・NORMAL＝構造式に名前つき・20秒・まちがえてもステージの終わりにもう一度（全50問を最後まで）
     HARD  ＝構造式だけ・12秒・ライフ3（0でゲームオーバー）・得点 1.5倍
     ステージれんしゅう＝1ステージだけ（記録は残さない）／こたえの経路図＝完成した地図をいつでも見られる
   ・得点：正解 100 ＋ 速さ（最大100）＋ コンボ（1問ごとに +20・最大 +200）。ステージをノーミスで +500（ミスありは +100）。
           まちがえた問題のやり直しは +50。全問ノーミスで +2,000。HARD はライフ1つにつき +500。
   ・記録は magichemlex_v1 の best（rtN＝NORMAL の最高点・rtH＝HARD・rtC＝最大コンボ・rtP＝遊んだ回数・rtOk＝最多正解）。
     best は xeva-cloud の mergeChem が「大きいほう」で混ぜるので、ほかの端末の記録とも合う。XEVA のごほうびは付けていない。
   ★ 試験名・大学名・年度などの固有名詞は出さない（MagiChemLex の決まり）。化合物の番号 1〜23 はもとの図と同じ。
   ★ 確かめるときは window.__MCL_RT_NOSAVE = true で記録を書かない。MCLRoute._peek() がいまの問題と正解の番号を返す。
   ============================================================ */
(function () {
  "use strict";
  const M = window.MCL, U = window.MCLUI;
  if (!M || !U) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = M.esc;
  const nf = (n) => Number(n || 0).toLocaleString();
  const CIRC = "⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓";
  const no = (n) => CIRC.charAt(n) || String(n);
  /* 画面に出す番号は、地図の箱と同じ黄色い札（丸数字は小さくて読みにくい） */
  const noH = (n) => '<i class="rt-no">' + n + "</i>";
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  /* ══ 化合物（番号はもとの図と同じ）。tip＝答え合わせで出すひとこと／sim＝まぎらわしい化合物（選択肢に出す） ══ */
  const CP = {
    bz: { nm: "ベンゼン" },
    1: { nm: "エチルベンゼン", tip: "ベンゼンにエチル基 –CH₂–CH₃ が付いたもの。スチレンの原料。", sim: [16, 20, 2] },
    2: { nm: "スチレン", tip: "ビニル基 –CH=CH₂ をもつ。付加重合させるとポリスチレン。", sim: [1, 20, 16] },
    3: { nm: "ニトロベンゼン", tip: "淡黄色の液体で水より重い。還元するとアニリンになる。", sim: [5, 23, 8] },
    4: { nm: "アニリン塩酸塩", tip: "アニリンが塩酸と塩をつくったもの（水にとける）。", sim: [5, 7, 6] },
    5: { nm: "アニリン", tip: "弱い塩基。さらし粉で赤紫色、二クロム酸カリウムで黒色（アニリンブラック）。", sim: [4, 3, 6] },
    6: { nm: "アセトアニリド", tip: "アミド結合 –NH–CO– をもつ白色の結晶。", sim: [5, 15, 4] },
    7: { nm: "塩化ベンゼンジアゾニウム", tip: "ジアゾニウム塩。不安定で、5 ℃をこえると分解する（だから氷冷）。", sim: [4, 12, 5] },
    8: { nm: "ベンゼンスルホン酸", tip: "スルホ基 –SO₃H をもつ強い酸。", sim: [9, 3, 17] },
    9: { nm: "ベンゼンスルホン酸ナトリウム", tip: "ベンゼンスルホン酸の塩。アルカリ融解の原料。", sim: [8, 10, 4] },
    10: { nm: "ナトリウムフェノキシド", tip: "フェノールの塩。フェノールは炭酸より弱い酸なので、CO₂ や塩酸でフェノールにもどる。", sim: [11, 9, 18] },
    11: { nm: "フェノール", tip: "弱い酸。塩化鉄(Ⅲ)水溶液で紫色になる。", sim: [10, 17, 13] },
    12: { nm: "p-ヒドロキシアゾベンゼン", tip: "アゾ基 –N=N– をもつ橙赤色の染料（アゾ染料）。", sim: [7, 6, 13] },
    13: { nm: "サリチル酸", tip: "–OH と –COOH がとなりどうし（オルト位）。酸とフェノールの両方の性質。", sim: [17, 14, 11] },
    14: { nm: "サリチル酸メチル", tip: "–COOH がエステルになったもの。消炎鎮痛剤（湿布薬）。", sim: [15, 13, 17] },
    15: { nm: "アセチルサリチル酸", tip: "–OH がアセチル化されたもの。解熱鎮痛剤（アスピリン）。", sim: [14, 13, 6] },
    16: { nm: "トルエン", tip: "メチル基をもつ。側鎖を酸化すると安息香酸。", sim: [1, 17, 18] },
    17: { nm: "安息香酸", tip: "白色結晶の芳香族カルボン酸。", sim: [16, 13, 8] },
    18: { nm: "クロロベンゼン", tip: "ベンゼンの H が Cl に置換したもの。", sim: [16, 11, 19] },
    19: { nm: "2,4,6-トリブロモフェノール", tip: "白色の沈殿。フェノールの検出に使う反応。", sim: [23, 18, 11] },
    20: { nm: "クメン", tip: "イソプロピルベンゼン。クメン法の最初の中間体。", sim: [1, 21, 2] },
    21: { nm: "クメンヒドロペルオキシド", tip: "–O–O–H をもつ過酸化物。酸で分解する。", sim: [20, 22, 15] },
    22: { nm: "アセトン", tip: "クメン法でフェノールといっしょにできるケトン。", sim: [21, 17, 14] },
    23: { nm: "ピクリン酸", alt: "2,4,6-トリニトロフェノール", tip: "黄色の結晶。強い酸で、爆発性がある。", sim: [19, 3, 13] },
  };

  /* ══ 加えるもの・条件（選択肢の札）。fam が同じものは同じ問題に並べない（まぎらわしすぎるため） ══ */
  const RG = {
    c2h4: { t: "エチレン C₂H₄", s: "酸触媒", fam: "c2h4" },
    deh: { t: "脱水素（−H₂）", s: "触媒・高温", fam: "deh" },
    nit: { t: "濃硝酸＋濃硫酸", s: "約 60 ℃", fam: "nit" },
    sn: { t: "スズ Sn＋濃塩酸", s: "還元", fam: "sn" },
    naoh: { t: "NaOH 水溶液", s: "常温", fam: "naohaq" },
    ac2o: { t: "無水酢酸 (CH₃CO)₂O", s: "", fam: "ac2o" },
    diazo: { t: "NaNO₂＋塩酸", s: "氷冷（5 ℃以下）", fam: "diazo" },
    h2o: { t: "水 H₂O", s: "加熱", fam: "h2o" },
    h2so4: { t: "濃硫酸", s: "加熱（約 100 ℃）", fam: "h2so4" },
    fuse: { t: "NaOH（固体）", s: "約 300 ℃で融解", fam: "fuse" },
    hcl: { t: "希塩酸", s: "", fam: "hcl" },
    co2: { t: "CO₂（高温・高圧）", s: "そのあと酸 H⁺", fam: "co2" },
    meoh: { t: "メタノール CH₃OH", s: "濃硫酸（酸触媒）", fam: "meoh" },
    ch3cl: { t: "クロロメタン CH₃Cl", s: "AlCl₃（触媒）", fam: "ch3cl" },
    kmno4: { t: "KMnO₄ で酸化", s: "そのあと希塩酸", fam: "kmno4" },
    cl2: { t: "塩素 Cl₂", s: "鉄粉（触媒）", fam: "cl2" },
    naohp: { t: "NaOH 水溶液", s: "高温・高圧", fam: "naohaq" },
    br2: { t: "臭素水 Br₂", s: "", fam: "br2" },
    nit3: { t: "濃硝酸＋濃硫酸", s: "高温", fam: "nit" },
    c3h6: { t: "プロペン CH₃CH=CH₂", s: "触媒", fam: "c3h6" },
    o2: { t: "酸素 O₂", s: "おだやかに酸化", fam: "o2" },
    h2so4d: { t: "希硫酸", s: "分解", fam: "h2so4d" },
  };

  /* ══ 矢印（もとの図の27本）══
     f→t＝どこからどこへ／g＝線の形（h 横・v 縦・el かぎ形・dg ななめ）／rg＝正解の札（e14 だけは相手の化合物 cp）
     lab＝地図の矢印に出す文字（上・下）／rx＝反応の名前／tip＝ひとこと／trap＝よくあるまちがい（選択肢に入れる）／ex＝選択肢に入れない札 */
  const E = {
    e1: { f: "b0", t: ["n1"], g: "h", rg: "c2h4", lab: ["C₂H₄", "酸触媒"], rx: "アルキル化（エチル基を入れる）", tip: "酸触媒でエチレンをベンゼンに付加させる。", trap: ["c3h6", "ch3cl"] },
    e2: { f: "n1", t: ["n2"], g: "h", rg: "deh", lab: ["−H₂", "触媒"], rx: "脱水素", tip: "エチル基から H₂ がとれて、C=C（ビニル基）ができる。", trap: ["o2", "kmno4"] },
    e3: { f: "b1", t: ["n3"], g: "h", rg: "nit", lab: ["濃硝酸・濃硫酸", "60 ℃"], rx: "ニトロ化", tip: "混酸（濃硝酸＋濃硫酸）で –NO₂ を入れる。濃硫酸は触媒。", trap: ["h2so4", "hcl"] },
    e4: { f: "n3", t: ["n4"], g: "h", rg: "sn", lab: ["Sn＋濃塩酸", ""], rx: "還元", tip: "–NO₂ をスズと濃塩酸で還元。塩酸が多いので、できたアニリンは塩酸塩になる。", trap: ["diazo", "naoh"] },
    e5: { f: "n4", t: ["n5"], g: "h", rg: "naoh", lab: ["NaOH 水溶液", ""], rx: "弱塩基の遊離", tip: "強い塩基の NaOH を加えると、弱い塩基のアニリンが追い出される。", trap: ["hcl", "sn"], ex: ["fuse"] },
    e6: { f: "n5", t: ["n6"], g: "h", rg: "ac2o", lab: ["(CH₃CO)₂O", ""], rx: "アセチル化", tip: "–NH₂ の H がアセチル基に置きかわり、アミド結合ができる。", trap: ["meoh", "diazo"] },
    e7: { f: "n5", t: ["n7"], g: "v", rg: "diazo", lab: ["NaNO₂・HCl", "低温"], rx: "ジアゾ化", tip: "亜硝酸ナトリウムと塩酸を、氷で冷やしながら加える。", trap: ["sn", "ac2o"] },
    e8: { f: "n7", t: ["n11"], g: "v", rg: "h2o", lab: ["H₂O", "加熱"], rx: "加水分解", tip: "ジアゾニウム塩の水溶液を加熱すると、N₂ を出してフェノールになる。", trap: ["naoh", "hcl"] },
    e9: { f: "b4", t: ["n8"], g: "h", rg: "h2so4", lab: ["濃硫酸", "100 ℃"], rx: "スルホン化", tip: "濃硫酸と加熱して –SO₃H を入れる。", trap: ["nit", "h2so4d"] },
    e10: { f: "n8", t: ["n9"], g: "h", rg: "naoh", lab: ["NaOH", ""], rx: "中和", tip: "スルホン酸は強い酸。NaOH で中和すると塩になる。", trap: ["hcl", "co2"], ex: ["fuse"] },
    e11: { f: "n9", t: ["n10"], g: "el", rg: "fuse", lab: ["NaOH（固）", "300 ℃"], rx: "アルカリ融解", tip: "固体の NaOH と高温で融かすと、–SO₃Na が –ONa に置きかわる。", trap: ["naohp", "hcl"] },
    e12: { f: "n10", t: ["n11"], g: "h", dy: -17, rg: "hcl", lab: ["希塩酸", ""], rx: "弱酸の遊離", tip: "フェノールは弱い酸。強い酸の塩酸を加えると追い出される。", trap: ["co2", "naoh"], ex: ["h2so4d", "h2so4"] },
    e13: { f: "n11", t: ["n10"], g: "h", dy: 17, below: 1, rg: "naoh", lab: ["NaOH", ""], rx: "中和", tip: "フェノールは酸なので、NaOH 水溶液と塩（ナトリウムフェノキシド）をつくる。", trap: ["hcl", "co2"], ex: ["fuse"] },
    e14: { f: "n7", t: ["n12"], g: "h", cp: 10, lab: ["カップリング", ""], rx: "ジアゾカップリング", tip: "ジアゾニウム塩とナトリウムフェノキシドから、アゾ基 –N=N– をもつ染料ができる。", sim: [11, 5, 9] },
    e15: { f: "n10", t: ["n13"], g: "h", rg: "co2", lab: ["CO₂ 高温・高圧", "→ H⁺"], rx: "サリチル酸の合成", tip: "高温・高圧で CO₂ と反応させてサリチル酸ナトリウムに。酸を加えるとサリチル酸。", trap: ["hcl", "meoh"] },
    e16: { f: "n13", t: ["n14"], g: "h", rg: "meoh", lab: ["CH₃OH", "酸触媒"], rx: "エステル化", tip: "–COOH がメタノールとエステルをつくる（濃硫酸が触媒）。", trap: ["ac2o", "c2h4"] },
    e17: { f: "n13", t: ["n15"], g: "v", rg: "ac2o", lab: ["(CH₃CO)₂O", ""], rx: "アセチル化", tip: "–OH が無水酢酸でアセチル化される（エステルができる）。", trap: ["meoh", "diazo"] },
    e18: { f: "b5", t: ["n16"], g: "h", rg: "ch3cl", lab: ["CH₃Cl", "（AlCl₃）"], rx: "アルキル化（メチル基を入れる）", tip: "塩化アルミニウムを触媒に、クロロメタンでメチル基を入れる。", trap: ["cl2", "c2h4"], ex: ["meoh"] },
    e19: { f: "n16", t: ["n17"], g: "h", rg: "kmno4", lab: ["KMnO₄", "→ 希塩酸"], rx: "側鎖の酸化", tip: "メチル基が酸化されて –COOK に。希塩酸を加えると安息香酸が遊離する。", trap: ["h2so4d", "hcl"], ex: ["o2"] },
    e20: { f: "b6", t: ["n18"], g: "h", rg: "cl2", lab: ["Cl₂", "鉄触媒"], rx: "塩素化（置換）", tip: "鉄（塩化鉄(Ⅲ)）を触媒に、H が Cl に置換する。", trap: ["hcl", "ch3cl"] },
    e21: { f: "n18", t: ["m10"], g: "h", rg: "naohp", lab: ["NaOH 水溶液", "高温・高圧"], rx: "加水分解", tip: "高温・高圧の NaOH 水溶液で、–Cl が –ONa に置きかわる。", trap: ["fuse", "hcl"] },
    e22: { f: "m10", t: ["m11"], g: "h", rg: "hcl", lab: ["希塩酸", ""], rx: "弱酸の遊離", tip: "フェノールは弱い酸。強い酸の塩酸を加えると追い出される。", trap: ["co2", "naoh"], ex: ["h2so4d", "h2so4"] },
    e23: { f: "m11", t: ["n19"], g: "h", rg: "br2", lab: ["Br₂ 水", ""], rx: "臭素化（置換）", tip: "フェノールは反応しやすく、臭素水だけで3か所（o-・p-）が置換して白色沈殿。", trap: ["cl2", "kmno4"] },
    e24: { f: "m11", t: ["n23"], g: "dg", rg: "nit3", lab: ["濃硝酸・濃硫酸", "高温"], rx: "ニトロ化", tip: "混酸と加熱して、3か所をニトロ化する。", trap: ["h2so4", "br2"] },
    e25: { f: "b7", t: ["n20"], g: "h", rg: "c3h6", lab: ["CH₃CH=CH₂", "触媒"], rx: "クメン法 ①", tip: "プロペンをベンゼンに付加させて、クメンをつくる。", trap: ["c2h4", "ch3cl"] },
    e26: { f: "n20", t: ["n21"], g: "h", rg: "o2", lab: ["O₂", "ゆるく酸化"], rx: "クメン法 ②", tip: "酸素（空気）で酸化して、クメンヒドロペルオキシドにする。", trap: ["kmno4", "deh"] },
    e27: { f: "n21", t: ["n22", "m11"], g: "h", below: 1, rg: "h2so4d", lab: ["希硫酸", "分解"], rx: "クメン法 ③", tip: "希硫酸で分解すると、フェノールとアセトンが同時にできる。", trap: ["naoh", "o2"], ex: ["hcl"] },
  };

  /* ══ ステージ（seq＝出す順。e◯＝矢印・c◯＝化合物）／need＝れんしゅうで1ステージだけ遊ぶとき、先に見えている化合物 ══ */
  const ST = [
    { nm: "アルキル化と脱水素", sub: "ベンゼン → ① → ②", seq: ["e1", "c1", "e2", "c2"] },
    { nm: "ニトロ化からアニリンへ", sub: "ベンゼン → ③ → ④ → ⑤ → ⑥", seq: ["e3", "c3", "e4", "c4", "e5", "c5", "e6", "c6"] },
    { nm: "スルホン化とアルカリ融解", sub: "ベンゼン → ⑧ → ⑨ → ⑩ ⇄ ⑪", seq: ["e9", "c8", "e10", "c9", "e11", "c10", "e12", "c11", "e13"] },
    { nm: "ジアゾ化とカップリング", sub: "⑤ → ⑦ → ⑪・⑫", seq: ["e7", "c7", "e8", "e14", "c12"], need: [5, 10, 11] },
    { nm: "サリチル酸のなかま", sub: "⑩ → ⑬ → ⑭・⑮", seq: ["e15", "c13", "e16", "c14", "e17", "c15"], need: [10] },
    { nm: "トルエンの酸化", sub: "ベンゼン → ⑯ → ⑰", seq: ["e18", "c16", "e19", "c17"] },
    { nm: "クロロベンゼンとフェノールの置換", sub: "ベンゼン → ⑱ → ⑩ → ⑪ → ⑲・㉓", seq: ["e20", "c18", "e21", "e22", "e23", "c19", "e24", "c23"], need: [10, 11] },
    { nm: "クメン法", sub: "ベンゼン → ⑳ → ㉑ → ⑪ ＋ ㉒", seq: ["e25", "c20", "e26", "c21", "e27", "c22"], need: [11] },
  ];
  const TOTAL = ST.reduce((a, s) => a + s.seq.length, 0);

  /* ══════════════ 構造式（SVG）══════════════
     ベンゼン環は半径 20・頂点は右から反時計回りに 0〜5（0＝右・1＝右上・3＝左・5＝右下）。
     文字は等幅の太字で、元素ごとに色を付ける（O 赤・N 青・S 黄・Cl 緑・Br 橙・Na 紫）。下つき・上つきは Unicode の文字。 */
  const A60 = Math.PI / 3, RR = 20, BL = 12, CW = 7.8;
  const f1 = (v) => Math.round(v * 10) / 10;
  function color(lab) {
    return lab.replace(/([A-Z][a-z]?)([₀-₉]*)|([^A-Z]+)/g, (m, el, sub, other) => (el ? '<tspan class="a-' + el + '">' + el + sub + "</tspan>" : esc(other)));
  }
  function Mb() {
    const o = { h: "", x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    const ext = (x, y) => { if (x < o.x0) o.x0 = x; if (x > o.x1) o.x1 = x; if (y < o.y0) o.y0 = y; if (y > o.y1) o.y1 = y; };
    const ln = (x1, y1, x2, y2) => { o.h += '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '"/>'; ext(x1, y1); ext(x2, y2); };
    o.bond = (x1, y1, x2, y2, n) => {
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, px = -dy / d, py = dx / d;
      (n === 2 ? [-1.8, 1.8] : n === 3 ? [-3.2, 0, 3.2] : [0]).forEach((k) => ln(x1 + px * k, y1 + py * k, x2 + px * k, y2 + py * k));
    };
    o.ring = (cx, cy) => {
      const v = [];
      for (let k = 0; k < 6; k++) v.push([cx + RR * Math.cos(k * A60), cy - RR * Math.sin(k * A60)]);
      o.h += '<polygon points="' + v.map((p) => f1(p[0]) + "," + f1(p[1])).join(" ") + '"/>';
      v.forEach((p) => ext(p[0], p[1]));
      [0, 2, 4].forEach((k) => {
        const a = v[k], b = v[(k + 1) % 6], s = (RR - 4.6) / RR;
        const ax = cx + (a[0] - cx) * s, ay = cy + (a[1] - cy) * s, bx = cx + (b[0] - cx) * s, by = cy + (b[1] - cy) * s;
        ln(ax + (bx - ax) * 0.14, ay + (by - ay) * 0.14, bx + (ax - bx) * 0.14, by + (ay - by) * 0.14);
      });
    };
    o.tx = (x, y, lab, an) => {
      const w = Array.from(lab).length * CW, xa = an === "end" ? x - w : an === "middle" ? x - w / 2 : x;
      ext(xa, y - 7.5); ext(xa + w, y + 7.5);
      o.h += '<text x="' + f1(x) + '" y="' + f1(y + 4.6) + '" text-anchor="' + an + '">' + color(lab) + "</text>";
    };
    /* 環の頂点 k から外へ1本のばして、その先に文字 */
    o.sub = (cx, cy, k, lab) => {
      const c = Math.cos(k * A60), s = -Math.sin(k * A60);
      const x2 = cx + (RR + BL) * c, y2 = cy + (RR + BL) * s;
      o.bond(cx + RR * c, cy + RR * s, x2, y2);
      if (k === 0) o.tx(x2 + 2, y2, lab, "start");
      else if (k === 3) o.tx(x2 - 2, y2, lab, "end");
      else if (k === 1 || k === 5) o.tx(x2 + 1, y2 + (k === 1 ? -4 : 4), lab, "start");
      else o.tx(x2 - 1, y2 + (k === 2 ? -4 : 4), lab, "end");
    };
    /* かっこ［ ］ */
    o.brk = (xl, xr) => {
      [[xl, 1], [xr, -1]].forEach((p) => { o.h += '<path d="M' + f1(p[0] + 5 * p[1]) + " -25H" + f1(p[0]) + "V25H" + f1(p[0] + 5 * p[1]) + '"/>'; });
      ext(xl, -25); ext(xr, 25);
    };
    return o;
  }
  const mono = (lab) => (m) => { m.ring(0, 0); m.sub(0, 0, 0, lab); };
  const MOL = {
    bz: (m) => { m.ring(0, 0); },
    1: mono("CH₂–CH₃"), 2: mono("CH=CH₂"), 3: mono("NO₂"), 4: mono("NH₃Cl"), 5: mono("NH₂"),
    6: (m) => {
      m.ring(0, 0); m.bond(20, 0, 32, 0); m.tx(38, 0, "N", "middle"); m.bond(44, 0, 56, 0); m.tx(62, 0, "C", "middle"); m.bond(68, 0, 80, 0); m.tx(82, 0, "CH₃", "start");
      m.bond(38, 8, 38, 14); m.tx(38, 21, "H", "middle"); m.bond(62, 8, 62, 14, 2); m.tx(62, 21, "O", "middle");
    },
    7: (m) => { m.ring(0, 0); m.bond(20, 0, 32, 0); m.tx(34, 0, "N⁺", "start"); m.bond(52, 0, 63, 0, 3); m.tx(70, 0, "N", "middle"); m.brk(-27, 80); m.tx(85, 0, "Cl⁻", "start"); },
    8: mono("SO₃H"), 9: mono("SO₃Na"), 10: mono("ONa"), 11: mono("OH"),
    12: (m) => { m.ring(0, 0); m.bond(20, 0, 31, 0); m.tx(37, 0, "N", "middle"); m.bond(43, 0, 54, 0, 2); m.tx(60, 0, "N", "middle"); m.bond(66, 0, 77, 0); m.ring(97, 0); m.sub(97, 0, 0, "OH"); },
    13: (m) => { m.ring(0, 0); m.sub(0, 0, 1, "COOH"); m.sub(0, 0, 0, "OH"); },
    14: (m) => {
      m.ring(0, 0); m.sub(0, 0, 1, "OH");
      m.bond(20, 0, 32, 0); m.tx(38, 0, "C", "middle"); m.bond(44, 0, 55, 0); m.tx(61, 0, "O", "middle"); m.bond(67, 0, 78, 0); m.tx(80, 0, "CH₃", "start");
      m.bond(38, 8, 38, 14, 2); m.tx(38, 21, "O", "middle");
    },
    15: (m) => {
      m.ring(0, 0);
      m.bond(10, -17.3, 16, -27.7); m.tx(22, -33, "O", "middle"); m.bond(28, -33, 39, -33); m.tx(45, -33, "C", "middle"); m.bond(51, -33, 62, -33); m.tx(64, -33, "CH₃", "start");
      m.bond(45, -41, 45, -47, 2); m.tx(45, -54, "O", "middle");
      m.bond(20, 0, 32, 0); m.tx(38, 0, "C", "middle"); m.bond(44, 0, 55, 0); m.tx(57, 0, "OH", "start");
      m.bond(38, 8, 38, 14, 2); m.tx(38, 21, "O", "middle");
    },
    16: mono("CH₃"), 17: mono("COOH"), 18: mono("Cl"),
    19: (m) => { m.ring(0, 0); m.sub(0, 0, 3, "Br"); m.sub(0, 0, 1, "Br"); m.sub(0, 0, 0, "OH"); m.sub(0, 0, 5, "Br"); },
    20: (m) => {
      m.ring(0, 0); m.bond(20, 0, 32, 0); m.tx(41, 0, "CH", "middle");
      m.bond(41, -8, 41, -14); m.tx(41, -21, "CH₃", "middle"); m.bond(41, 8, 41, 14); m.tx(41, 21, "CH₃", "middle");
    },
    21: (m) => {
      m.ring(0, 0); m.bond(20, 0, 32, 0); m.tx(38, 0, "C", "middle");
      m.bond(38, -8, 38, -14); m.tx(38, -21, "CH₃", "middle"); m.bond(38, 8, 38, 14); m.tx(38, 21, "CH₃", "middle");
      m.bond(44, 0, 55, 0); m.tx(61, 0, "O", "middle"); m.bond(67, 0, 78, 0); m.tx(84, 0, "O", "middle"); m.bond(90, 0, 101, 0); m.tx(107, 0, "H", "middle");
    },
    22: (m) => {
      m.tx(0, 0, "C", "middle"); m.bond(-6, 0, -17, 0); m.tx(-19, 0, "CH₃", "end"); m.bond(6, 0, 17, 0); m.tx(19, 0, "CH₃", "start");
      m.bond(0, 8, 0, 14, 2); m.tx(0, 21, "O", "middle");
    },
    23: (m) => { m.ring(0, 0); m.sub(0, 0, 3, "O₂N"); m.sub(0, 0, 1, "NO₂"); m.sub(0, 0, 0, "OH"); m.sub(0, 0, 5, "NO₂"); },
  };
  /* 小さい分子が大きく引きのばされないよう、わくは 最小 116×66 にそろえる（どれも同じくらいの大きさに見える） */
  const MOLC = {};
  function molOf(id) {
    if (MOLC[id]) return MOLC[id];
    const m = Mb(); MOL[id](m);
    let x = m.x0 - 4, y = m.y0 - 4, w = m.x1 - m.x0 + 8, h = m.y1 - m.y0 + 8;
    if (w < 116) { x -= (116 - w) / 2; w = 116; }
    if (h < 66) { y -= (66 - h) / 2; h = 66; }
    return (MOLC[id] = { h: m.h, vb: [x, y, w, h].map(f1).join(" ") });
  }
  function molSVG(id, cls) {
    const m = molOf(id);
    return '<svg class="rt-mol' + (cls ? " " + cls : "") + '" viewBox="' + m.vb + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + m.h + "</svg>";
  }

  /* ══════════════ 地図（もとの図2枚ぶんを1枚に）══════════════
     ます目：横 0〜6・縦 0〜7（6・7 が2枚めの図）。ベンゼンは枝ごとに置き、同じものどうしを点線でつなぐ。 */
  const NW = 124, NH = 86, PX = 232, PY = 150, X0 = 40, Y0 = 74, GAP2 = 76;
  const gx = (c) => X0 + NW / 2 + c * PX, gy = (r) => Y0 + NH / 2 + r * PY + (r >= 6 ? GAP2 : 0);
  const NODES = {
    b0: ["bz", 0, 0], n1: [1, 1, 0], n2: [2, 2, 0],
    b1: ["bz", 0, 1], n3: [3, 1, 1], n4: [4, 2, 1], n5: [5, 3, 1], n6: [6, 4, 1],
    n7: [7, 3, 2], n12: [12, 4, 2],
    n11: [11, 3, 3], n10: [10, 4, 3], n13: [13, 5, 3], n14: [14, 6, 3],
    b4: ["bz", 0, 4], n8: [8, 1, 4], n9: [9, 2, 4], n15: [15, 5, 4],
    b5: ["bz", 0, 5], n16: [16, 1, 5], n17: [17, 2, 5],
    b6: ["bz", 0, 6], n18: [18, 1, 6], m10: [10, 2, 6], m11: [11, 3, 6], n19: [19, 4, 6],
    b7: ["bz", 0, 7], n20: [20, 1, 7], n21: [21, 2, 7], n22: [22, 3, 7], n23: [23, 4, 7],
  };
  const ND = {};
  Object.keys(NODES).forEach((id) => { const a = NODES[id]; ND[id] = { id, cp: a[0], x: gx(a[1]), y: gy(a[2]) }; });
  const WW = X0 * 2 + NW + 6 * PX, WH = gy(7) + NH / 2 + 78;
  const nodesOf = (cp) => Object.keys(ND).filter((id) => String(ND[id].cp) === String(cp));

  const GEO = {};
  function geo(id) {
    if (GEO[id]) return GEO[id];
    const e = E[id], a = ND[e.f], b = ND[e.t[0]], hw = NW / 2, hh = NH / 2, G = 5;
    let pts, lab; const extra = [];
    if (e.g === "h") {
      const dir = b.x > a.x ? 1 : -1, y = a.y + (e.dy || 0);
      pts = [[a.x + dir * (hw + G), y], [b.x - dir * (hw + G + 2), y]];
      const mx = (pts[0][0] + pts[1][0]) / 2;
      lab = e.below ? { x: mx, y1: y + 19, y2: y + 34, an: "middle" } : { x: mx, y1: y - 9, y2: y + 20, an: "middle" };
    } else if (e.g === "v") {
      const dir = b.y > a.y ? 1 : -1;
      pts = [[a.x, a.y + dir * (hh + G)], [b.x, b.y - dir * (hh + G + 2)]];
      const my = (pts[0][1] + pts[1][1]) / 2;
      lab = { x: a.x + 12, y1: my - 3, y2: my + 13, an: "start" };
    } else if (e.g === "el") {
      pts = [[a.x + hw + G, a.y], [b.x, a.y], [b.x, b.y + hh + G + 2]];
      lab = { x: (pts[0][0] + pts[1][0]) / 2, y1: a.y - 9, y2: a.y + 20, an: "middle" };
    } else {
      pts = [[a.x + hw - 16, a.y + hh + G], [b.x - hw + 16, b.y - hh - G - 2]];
      /* ななめの線の右上に2行（線にかからない高さ） */
      lab = { x: (pts[0][0] + pts[1][0]) / 2 + 10, y1: (pts[0][1] + pts[1][1]) / 2 - 17, y2: (pts[0][1] + pts[1][1]) / 2 - 2, an: "start" };
    }
    /* ⑦ ＋ ⑩ → ⑫：相手の ⑩ から ⑫ へ上がる線（＋の印） */
    if (id === "e14") { const p = ND.n10, q = ND.n12; extra.push({ pts: [[p.x, p.y - hh - G], [q.x, q.y + hh + G + 2]], plus: 1 }); }
    /* ㉑ → ⑪ ＋ ㉒：とちゅうから ⑪ へ上がる枝 */
    if (id === "e27") { const q = ND.m11; extra.push({ pts: [[a.x + hw + G + 30, a.y], [q.x - 36, q.y + hh + G + 2]] }); }
    /* カメラ用の範囲：両はしの箱・相手の箱・文字のあたり */
    const bb = [1e9, 1e9, -1e9, -1e9];
    const add = (x, y) => { if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (x > bb[2]) bb[2] = x; if (y > bb[3]) bb[3] = y; };
    [e.f].concat(e.t, id === "e14" ? ["n10"] : []).forEach((n) => { const d = ND[n]; add(d.x - hw, d.y - hh - 26); add(d.x + hw, d.y + hh); });
    pts.forEach((p) => add(p[0], p[1]));
    const lw = lab.an === "middle" ? 62 : 0;
    add(lab.x - lw, lab.y1 - 14); add(lab.x + (lab.an === "middle" ? 62 : 118), lab.y2 + 6);
    return (GEO[id] = { pts, lab, extra, bb });
  }
  function head(pts) {
    const q = pts[pts.length - 1], p = pts[pts.length - 2];
    const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const bx = q[0] - ux * 11, by = q[1] - uy * 11;
    return '<polygon points="' + [[q[0] + ux * 2, q[1] + uy * 2], [bx - uy * 6, by + ux * 6], [bx + uy * 6, by - ux * 6]].map((v) => f1(v[0]) + "," + f1(v[1])).join(" ") + '"/>';
  }
  const dOf = (pts) => "M" + pts.map((p) => f1(p[0]) + " " + f1(p[1])).join("L");
  function edgeG(id, rv, cur) {
    const e = E[id], g = geo(id), L = g.lab;
    let h = '<g class="rt-e ' + (rv ? "rev" : "hid") + (cur ? " cur" : "") + '" data-e="' + id + '">';
    h += '<path d="' + dOf(g.pts) + '"/>' + head(g.pts);
    g.extra.forEach((x) => {
      if (x.plus && !rv) return;      /* ⑦＋⑩→⑫ の相手の線は、矢印をかくしている間は出さない（相手を聞く問題の答えが見えてしまう） */
      h += '<path d="' + dOf(x.pts) + '"/>' + head(x.pts);
      if (x.plus) { const mx = (x.pts[0][0] + x.pts[1][0]) / 2, my = (x.pts[0][1] + x.pts[1][1]) / 2; h += '<g class="rt-plus"><rect x="' + (mx - 11) + '" y="' + (my - 11) + '" width="22" height="22" rx="3"/><text x="' + mx + '" y="' + (my + 5.5) + '">＋</text></g>'; }
    });
    const at = ' x="' + f1(L.x) + '" text-anchor="' + L.an + '"';
    if (rv) {
      h += '<text class="rt-el"' + at + ' y="' + f1(L.y1) + '">' + esc(e.lab[0]) + "</text>";
      if (e.lab[1]) h += '<text class="rt-el rt-el2"' + at + ' y="' + f1(L.y2) + '">' + esc(e.lab[1]) + "</text>";
    } else h += '<text class="rt-el"' + at + ' y="' + f1(L.y1) + '">？？？</text>';
    return h + "</g>";
  }
  const txW = (s) => Array.from(s).reduce((a, ch) => a + (ch.charCodeAt(0) < 256 ? 6.4 : 11), 0);
  function nodeG(id, rv, cur) {
    const n = ND[id], bz = n.cp === "bz", c = CP[n.cp];
    let h = '<g class="rt-n ' + (bz ? "bz " : "") + (rv ? "rev" : "hid") + (cur ? " cur" : "") + '" data-n="' + id + '" transform="translate(' + (n.x - NW / 2) + "," + (n.y - NH / 2) + ')">';
    h += '<rect class="rt-nr" width="' + NW + '" height="' + NH + '" rx="6"/>';
    if (rv) {
      const m = molOf(n.cp), w = txW(c.nm);
      h += '<svg class="rt-mol" x="6" y="4" width="' + (NW - 12) + '" height="' + (NH - 26) + '" viewBox="' + m.vb + '" preserveAspectRatio="xMidYMid meet">' + m.h + "</svg>";
      h += '<text class="rt-nn" x="' + NW / 2 + '" y="' + (NH - 8) + '"' + (w > NW - 10 ? ' textLength="' + (NW - 10) + '" lengthAdjust="spacingAndGlyphs"' : "") + ">" + esc(c.nm) + "</text>";
    } else h += '<text class="rt-nq" x="' + NW / 2 + '" y="' + (NH / 2 + 13) + '">？</text>';
    if (!bz) h += '<g class="rt-nb"><rect x="-2" y="-10" width="28" height="20" rx="3"/><text x="12" y="5">' + n.cp + "</text></g>";
    return h + '<rect class="rt-fl" width="' + NW + '" height="' + NH + '" rx="6"/></g>';
  }
  /* st＝{ rev:{化合物:1}, erev:{矢印:1}, all, cur:いま聞いている矢印, curN:[いま聞いている箱] } */
  function worldSVG(st) {
    const rev = (cp) => cp === "bz" || st.all || !!(st.rev && st.rev[cp]);
    const erev = (id) => st.all || !!(st.erev && st.erev[id]);
    const bus = (ids) => '<path class="rt-bus" d="M' + ND[ids[0]].x + " " + ND[ids[0]].y + "V" + ND[ids[ids.length - 1]].y + '"/>';
    let h = '<svg class="rt-world" xmlns="http://www.w3.org/2000/svg" width="' + WW + '" height="' + WH + '" viewBox="0 0 ' + WW + " " + WH + '">';
    h += '<text class="rt-wh" x="' + X0 + '" y="42">ROUTE MAP 1</text><text class="rt-whs" x="' + (X0 + 196) + '" y="42">ベンゼンからの反応経路 ①（1〜17）</text>';
    h += '<text class="rt-wh" x="' + X0 + '" y="' + (gy(6) - NH / 2 - 30) + '">ROUTE MAP 2</text><text class="rt-whs" x="' + (X0 + 196) + '" y="' + (gy(6) - NH / 2 - 30) + '">ベンゼンからの反応経路 ②（18〜23）</text>';
    h += bus(["b0", "b1", "b4", "b5"]) + bus(["b6", "b7"]);
    Object.keys(E).forEach((id) => { h += edgeG(id, erev(id), st.cur === id); });
    Object.keys(ND).forEach((id) => { h += nodeG(id, rev(ND[id].cp), !!(st.curN && st.curN.indexOf(id) >= 0)); });
    return h + "</svg>";
  }
  /* ステージぜんたいの範囲（ステージクリアのとき、枝ぜんたいを見せる） */
  function stageBB(si) {
    const bb = [1e9, 1e9, -1e9, -1e9];
    ST[si].seq.forEach((k) => { if (k.charAt(0) !== "e") return; const g = geo(k).bb; bb[0] = Math.min(bb[0], g[0]); bb[1] = Math.min(bb[1], g[1]); bb[2] = Math.max(bb[2], g[2]); bb[3] = Math.max(bb[3], g[3]); });
    return bb;
  }

  /* ══════════════ 案内役のドット絵（ベンゼン環のかたちのキャラ）══════════════ */
  const SPR = ["....cccc....", "..cccccccc..", ".cccccccccc.", ".ccwkccwkcc.", "cccwkccwkccc", "cccccccccccc", "ccccmmmmcccc", ".cccccccccc.", "..cccccccc..", "....cccc....", "...y....y...", "..yy....yy.."];
  const SPC = { c: "#4de8ff", w: "#ffffff", k: "#0b1030", m: "#ff5fd2", y: "#ffe14d" };
  const SPRITE = (() => {
    let h = '<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">';
    SPR.forEach((row, y) => {
      let x = 0;
      while (x < 12) {
        const ch = row.charAt(x);
        if (ch === ".") { x++; continue; }
        let w = 1; while (x + w < 12 && row.charAt(x + w) === ch) w++;
        h += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="1" fill="' + SPC[ch] + '"/>'; x += w;
      }
    });
    return h + "</svg>";
  })();

  /* ══════════════ 見た目（CSS）══════════════ */
  const CSS = `
.rtb{position:relative;display:flex;align-items:center;gap:12px;width:100%;margin:10px 0 4px;padding:12px 14px;border-radius:10px;text-align:left;color:#eaf2ff;overflow:hidden;cursor:pointer;font:inherit;
  background:#0b1030;border:2px solid #4de8ff;box-shadow:0 0 0 2px #0b1030,0 0 0 4px #ff5fd2,0 8px 22px rgba(10,14,60,.3)}
.rtb::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 1px,transparent 1px 3px),radial-gradient(120% 140% at 0% 0%,rgba(77,232,255,.2),transparent 60%)}
.rtb>*{position:relative}
.rtb-ic{flex:none;width:40px;height:40px;display:grid;place-items:center;animation:rtBob .6s steps(2) infinite}
.rtb-ic svg{width:36px;height:36px;display:block}
.rtb-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.rtb-t small{font:900 .66rem ui-monospace,"Courier New",monospace;letter-spacing:.16em;color:#ffe14d}
.rtb-t small i{font-style:normal;margin-left:6px;padding:0 6px;background:#ff5fd2;color:#fff;letter-spacing:.04em}
.rtb-t>b{font-size:1rem;font-weight:900}
.rtb-t em{font-style:normal;font-size:.72rem;color:#b9c8ff}
.rtb-t em b{color:#ffe14d}
.rtb-go{flex:none;font:900 .68rem ui-monospace,"Courier New",monospace;color:#0b1030;background:#ffe14d;padding:6px 8px;border-radius:4px;box-shadow:0 3px 0 #a37c00;animation:rtBlink2 1s steps(2) infinite;white-space:nowrap}

.mclrt{position:fixed;inset:0;z-index:70;display:flex;flex-direction:column;overflow:hidden;color:#eaf2ff;background:#070a1f;opacity:0;transition:opacity .2s;
  font-family:"DotGothic16","Press Start 2P",ui-monospace,"MS Gothic","Osaka-Mono",monospace;font-size:15px;line-height:1.45;
  padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);
  -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.mclrt.on{opacity:1}
.mclrt[hidden]{display:none}
.mclrt:not(.on){pointer-events:none}
html.xv-full .mclrt{position:absolute;top:0;bottom:auto;height:var(--xv-fullh)}
.mclrt::before{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(1px 1px at 20% 30%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 70% 12%,#9fe9ff 50%,transparent 51%),radial-gradient(1px 1px at 86% 62%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 38% 82%,#ffd9f4 50%,transparent 51%),
  repeating-linear-gradient(0deg,rgba(77,232,255,.05) 0 1px,transparent 1px 32px),repeating-linear-gradient(90deg,rgba(77,232,255,.05) 0 1px,transparent 1px 32px),radial-gradient(120% 90% at 50% 0%,#141a52 0%,#070a1f 60%)}
.mclrt::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:9;background:repeating-linear-gradient(0deg,rgba(0,0,0,.2) 0 1px,transparent 1px 3px),radial-gradient(130% 100% at 50% 50%,transparent 62%,rgba(0,0,0,.42) 100%)}
.mclrt button{font-family:inherit;color:inherit}
.rt-root{position:relative;flex:1;min-height:0;width:100%;max-width:880px;margin:0 auto;display:flex;flex-direction:column}
.rt-px{font-family:"Press Start 2P","DotGothic16",ui-monospace,monospace}

/* ボタン */
.rt-btn{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;width:100%;padding:11px 12px;border-radius:6px;border:2px solid #eaf2ff;background:#16205e;box-shadow:0 5px 0 #03051a,inset 0 -4px 0 rgba(0,0,0,.28);cursor:pointer;text-align:center}
.rt-btn:active{transform:translateY(3px);box-shadow:0 2px 0 #03051a,inset 0 -2px 0 rgba(0,0,0,.28)}
.rt-btn b{font-size:1.02rem;font-weight:400;letter-spacing:.04em}
.rt-btn small{font-size:.74rem;color:#b9c8ff}
.rt-btn.pri{background:#0f6d8c;border-color:#4de8ff}
.rt-btn.pri b{color:#fff}
.rt-btn.hard{background:#7a1552;border-color:#ff5fd2}
.rt-btn.sm{padding:9px 8px}
.rt-btn.sm b{font-size:.9rem}
.rt-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rt-ib{width:36px;height:36px;border-radius:6px;border:2px solid #5a6cff;background:#111848;box-shadow:0 3px 0 #03051a;cursor:pointer;font-size:16px;line-height:1;display:grid;place-items:center;padding:0}
.rt-ib.off{opacity:.45}
.rt-x{position:absolute;top:10px;right:10px;width:38px;height:38px;border-radius:6px;border:2px solid #eaf2ff;background:#16205e;box-shadow:0 3px 0 #03051a;cursor:pointer;font-size:18px;line-height:1;z-index:2;padding:0}

/* タイトル */
.rt-ttl{position:relative;flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;display:flex;flex-direction:column;align-items:center;gap:12px;padding:18px 16px 22px}
.rt-ttl>*{width:100%;max-width:460px;flex:none}
.rt-ttl>.rt-x{width:38px}
.rt-logo{text-align:center;padding-top:10px}
.rt-logo small{display:block;font-size:.68rem;letter-spacing:.2em;color:#ffe14d}
.rt-logo h2{margin:8px 0 0;font:400 clamp(26px,9.4vw,46px)/1.15 "Press Start 2P","DotGothic16",ui-monospace,monospace;letter-spacing:.02em;color:#4de8ff;text-shadow:3px 3px 0 #ff5fd2,6px 6px 0 #232c7a}
.rt-logo h2.l2{color:#ffe14d;text-shadow:3px 3px 0 #ff5fd2,6px 6px 0 #232c7a}
.rt-logo h2 span,.rt-rh span,.rt-ban b span{display:inline-block;animation:rtDrop .5s steps(5) both}
.rt-logo p{margin:12px 0 0;font-size:1.05rem;letter-spacing:.2em;color:#fff}
.rt-logo.sm{padding-top:26px}
.rt-demo{position:relative;border:2px solid #2b3a8c;border-radius:6px;background:rgba(10,14,42,.82);padding:10px 8px 6px}
.rt-dm{display:flex;align-items:center;justify-content:center;gap:2px}
.rt-dm .rt-mol{width:30%;max-width:118px;height:58px}
.rt-dar{flex:none;width:26px;height:16px;position:relative;background:linear-gradient(#4de8ff,#4de8ff) left center/100% 3px no-repeat}
.rt-dar::after{content:"";position:absolute;right:-2px;top:50%;margin-top:-6px;border:6px solid transparent;border-left-color:#4de8ff}
.rt-dar i{position:absolute;left:0;right:0;top:-17px;text-align:center;font-style:normal;font-size:.8rem;color:#ffe14d;animation:rtBlink2 .8s steps(2) infinite}
.rt-dsp{position:absolute;left:8%;top:-14px;width:26px;height:26px;animation:rtRun 5.2s steps(40) infinite}
.rt-dsp svg{width:26px;height:26px;display:block;animation:rtBob .4s steps(2) infinite}
.rt-hi{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 14px;font-size:.84rem;color:#fff;text-align:center}
.rt-hi span{width:100%;font-size:.7rem;letter-spacing:.3em;color:#ff5fd2}
.rt-hi b{font-weight:400;letter-spacing:.06em}
.rt-hi i{font-style:normal;margin-left:6px;padding:0 5px;background:#ffe14d;color:#0b1030}
.rt-menu{display:flex;flex-direction:column;gap:12px}
.rt-how{border:2px solid #2b3a8c;border-radius:6px;background:rgba(10,14,42,.82);padding:8px 12px;font-size:.84rem}
.rt-how summary{cursor:pointer;color:#ffe14d}
.rt-how ul{margin:8px 0 2px;padding-left:1.2em;display:flex;flex-direction:column;gap:5px;color:#dbe6ff}
.rt-how b{color:#4de8ff;font-weight:400}
.rt-cr,.rt-note{margin:0;text-align:center;font-size:.78rem;color:#9fb0ee}
.rt-stg{display:grid;grid-template-columns:1fr;gap:10px}
.rt-btn.st{align-items:flex-start;text-align:left;padding:9px 12px}
.rt-btn.st i{font:400 .6rem "Press Start 2P",ui-monospace,monospace;font-style:normal;color:#ffe14d}
.rt-btn.st b{font-size:.98rem}

/* あそぶ画面 */
.rt-play{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden}
.rt-hud{flex:none;display:grid;grid-template-columns:36px 1.5fr 1fr 1fr 1.25fr 36px;gap:6px;align-items:center;padding:8px 8px 4px}
.rt-hud>div{min-width:0;text-align:center;border:2px solid #2b3a8c;border-radius:6px;background:rgba(10,14,42,.9);padding:2px 2px 3px;line-height:1.2}
.rt-hud small{display:block;font:400 .5rem "Press Start 2P",ui-monospace,monospace;color:#ff5fd2;letter-spacing:.06em;padding-top:2px}
.rt-hud b{display:block;font-weight:400;font-size:.98rem;color:#fff;white-space:nowrap;overflow:hidden}
.rt-hud>div.hot{border-color:#ffe14d}
.rt-hud>div.hot b{color:#ffe14d}
.rt-life{color:#ff5f7a;letter-spacing:.08em}
.rt-life s{text-decoration:none;color:#3a3f6e}
.rt-view{position:relative;flex:1 1 0;min-height:150px;margin:4px 8px;border:2px solid #4de8ff;border-radius:6px;overflow:hidden;background:#090d2b;box-shadow:inset 0 0 0 2px #05071a,0 0 14px rgba(77,232,255,.25)}
.rt-view.shake{animation:rtShake .36s steps(6)}
.rt-cam{position:absolute;left:0;top:0;transform-origin:0 0;transition:transform .6s cubic-bezier(.2,.8,.2,1);will-change:transform}
.rt-cam svg.rt-world{display:block}
.rt-sp{position:absolute;width:26px;height:26px;z-index:2;pointer-events:none}
.rt-sp svg{width:26px;height:26px;display:block;animation:rtBob .5s steps(2) infinite}
.rt-ban{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:10px;background:rgba(5,7,26,.74);cursor:pointer}
.rt-ban[hidden]{display:none}
.rt-ban b{font:400 clamp(18px,6.4vw,34px)/1.2 "Press Start 2P","DotGothic16",ui-monospace,monospace;color:#ffe14d;text-shadow:3px 3px 0 #ff5fd2}
.rt-ban span{font-size:1.02rem;color:#fff;letter-spacing:.08em}
.rt-ban.perfect b{color:#6dff9c}
.rt-ban.retry b{color:#ff8a5f}
.rt-pop{position:absolute;inset:0;z-index:3;pointer-events:none}
.rt-pp{position:absolute;left:50%;top:38%;transform:translate(-50%,0);font:400 1.15rem "Press Start 2P","DotGothic16",ui-monospace,monospace;color:#ffe14d;text-shadow:2px 2px 0 #05071a;white-space:nowrap;animation:rtUp 1s steps(10) both}
.rt-pp.cb{top:16%;font-size:.86rem;color:#6dff9c}
.rt-pp.ng{color:#ff6b8a}
.rt-q{flex:none;min-height:88px;margin:2px 8px 0;padding:7px 10px;border:2px solid #2b3a8c;border-radius:6px;background:rgba(10,14,42,.92);font-size:.92rem;display:flex;flex-direction:column;justify-content:center;gap:2px}
.rt-q b{font-weight:400;color:#9fe9ff}
.rt-q .hl{color:#ffe14d}
.rt-q small{font-size:.8rem;color:#9fb0ee}
.rt-j small{font-size:.7rem}
.rt-q p{margin:0;font-size:.82rem;color:#dbe6ff}
.rt-q p em{font-style:normal;color:#ffe14d}
.rt-q.fb.ok{border-color:#6dff9c}
.rt-q.fb.ng{border-color:#ff6b8a}
.rt-rd{align-self:flex-start;font:400 .7rem/1.45 "DotGothic16",ui-monospace,monospace;font-style:normal;padding:1px 7px;border-radius:3px;background:#4de8ff;color:#06203a;letter-spacing:.04em}
.rt-rd.b{background:#ff5fd2;color:#2a0320}
.rt-q small u{text-decoration:none;padding:0 5px;border:1px solid #ffe14d;border-radius:3px;color:#ffe14d;font-family:ui-monospace,"SF Mono",Menlo,Consolas,"DotGothic16",monospace}
.rt-ban.round b{color:#ff5fd2;text-shadow:3px 3px 0 #232c7a}
.rt-j{font-size:1rem}
.rt-j.ok{color:#6dff9c}
.rt-j.ng{color:#ff6b8a}
.rt-j b{color:#ffe14d;font-weight:400}
.rt-time{flex:none;height:10px;margin:6px 8px;border:2px solid #2b3a8c;border-radius:3px;background:#05071a;overflow:hidden}
.rt-time i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#6dff9c,#ffe14d)}
.rt-time i.low{background:#ff5f7a}
.rt-ops{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 8px;min-height:196px;align-content:start}
.rt-op{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-width:0;min-height:60px;padding:8px 6px 8px 28px;border-radius:6px;border:2px solid #5a6cff;background:#111848;box-shadow:0 4px 0 #03051a;cursor:pointer;text-align:center;line-height:1.3}
.rt-op:active{transform:translateY(2px);box-shadow:0 2px 0 #03051a}
.rt-op>i{position:absolute;left:5px;top:5px;width:18px;height:18px;display:grid;place-items:center;font:400 .56rem "Press Start 2P",ui-monospace,monospace;font-style:normal;color:#0b1030;background:#9fe9ff;border-radius:3px}
.rt-op b{font-weight:400;font-size:.9rem;color:#fff;overflow-wrap:anywhere}
.rt-op small{font-size:.74rem;color:#b9c8ff}
.rt-op.m{padding:4px 4px 5px;min-height:90px}
.rt-op.m .rt-mol{width:100%;height:66px}
.rt-on{font-size:.72rem;color:#cfe0ff;line-height:1.2;overflow-wrap:anywhere}
.rt-op:disabled{cursor:default}
.rt-op.ok{border-color:#6dff9c;background:#0e3b2c;box-shadow:0 4px 0 #03051a,0 0 12px rgba(109,255,156,.5)}
.rt-op.ng{border-color:#ff6b8a;background:#3d1026}
.rt-op.dim{opacity:.42}
.rt-foot{flex:none;height:46px;display:flex;align-items:center;justify-content:center;padding:0 8px 4px}
.rt-hint{font-size:.72rem;color:#7f8fd0}
.rt-next{display:block;text-align:center;width:100%;height:38px;border-radius:6px;border:2px solid #ffe14d;background:#5a4a00;color:#fff;font-size:.95rem;box-shadow:0 4px 0 #03051a;cursor:pointer;animation:rtBlink2 1s steps(2) infinite}
.rt-pz{position:absolute;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;padding:20px;background:#070a1f}
.rt-pz[hidden]{display:none}
.rt-pzb{width:100%;max-width:340px;display:flex;flex-direction:column;gap:14px;text-align:center}
.rt-pzb h3{margin:0;font:400 1.5rem "Press Start 2P",ui-monospace,monospace;color:#ffe14d;text-shadow:3px 3px 0 #ff5fd2;animation:rtBlink2 1.2s steps(2) infinite}
.rt-pzb p{margin:0;font-size:.76rem;color:#9fb0ee}

/* 地図（SVG） */
.rt-world text{font-family:"DotGothic16",ui-monospace,"MS Gothic",monospace}
.rt-no{display:inline-block;min-width:1.55em;padding:0 3px;margin:0 3px 0 1px;border-radius:3px;background:#ffe14d;color:#1a1400;font:700 .86em/1.4 ui-monospace,Consolas,Menlo,monospace;font-style:normal;text-align:center;vertical-align:1px}
.rt-world text.rt-el,.rt-op b,.rt-op small,.rt-q p,.rt-mr p,.rt-minfo,.rt-how{font-family:ui-monospace,"SF Mono",Menlo,Consolas,"DotGothic16","MS Gothic",monospace}
.rt-wh{font:400 20px "Press Start 2P","DotGothic16",ui-monospace,monospace;fill:#ff5fd2}
.rt-whs{font-size:15px;fill:#9fb0ee}
.rt-bus{fill:none;stroke:#3a4590;stroke-width:2;stroke-dasharray:3 6}
.rt-nr{fill:#101641;stroke:#5a6cff;stroke-width:2.5}
.rt-n.bz .rt-nr{stroke:#8f9fd8;fill:#141a45}
.rt-n.hid .rt-nr{stroke:#4a548f;stroke-dasharray:6 5;fill:#0b0f30}
.rt-n.cur .rt-nr{stroke:#ffe14d;stroke-width:3.5;stroke-dasharray:none;animation:rtBlinkS .7s steps(2) infinite}
.rt-nq{fill:#6f7fd8;font-size:38px;text-anchor:middle}
.rt-n.cur .rt-nq{fill:#ffe14d}
.rt-nn{fill:#cfe0ff;font-size:11.5px;text-anchor:middle}
.rt-nb rect{fill:#ffe14d;stroke:#0b1030;stroke-width:1.5}
.rt-nb text{fill:#1a1400;font:700 13px ui-monospace,"Courier New",monospace;text-anchor:middle}
.rt-fl{fill:#fff;opacity:0;pointer-events:none}
.rt-n.pop .rt-fl{animation:rtFlash .6s steps(6) both}
.rt-e path{fill:none;stroke:#39448f;stroke-width:3.5}
.rt-e polygon{fill:#39448f}
.rt-e.rev path{stroke:#4de8ff;stroke-dasharray:8 6;animation:rtFlow .7s linear infinite}
.rt-e.rev polygon{fill:#4de8ff}
.rt-e.cur path{stroke:#ffe14d;animation:rtBlinkS .7s steps(2) infinite}
.rt-e.cur polygon{fill:#ffe14d}
.rt-el{fill:#6f7fd8;font-size:13.5px}
.rt-e.rev .rt-el{fill:#eaf6ff}
.rt-e.rev .rt-el2{fill:#ffe14d}
.rt-e.cur .rt-el{fill:#ffe14d}
.rt-e.pop .rt-el{animation:rtBlinkS .3s steps(2) 3}
.rt-plus rect{fill:#0b1030;stroke:#ff5fd2;stroke-width:2}
.rt-plus text{fill:#ff5fd2;font-size:15px;text-anchor:middle}
.rt-mol line,.rt-mol polygon,.rt-mol path{fill:none;stroke:#e8f0ff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.rt-mol text{font-family:ui-monospace,"SF Mono",Menlo,Consolas,"DejaVu Sans Mono","Courier New",monospace;font-weight:700;font-size:13px;fill:#f2f6ff}
.rt-mol .a-O{fill:#ff8a8a}.rt-mol .a-N{fill:#86b6ff}.rt-mol .a-S{fill:#ffd84d}.rt-mol .a-Cl{fill:#6ef0b0}.rt-mol .a-Br{fill:#ffa94d}.rt-mol .a-Na{fill:#d8a8ff}

/* 結果 */
.rt-res{position:relative;flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;display:flex;flex-direction:column;align-items:center;gap:12px;padding:22px 16px 24px}
.rt-res>*{width:100%;max-width:460px;flex:none}
.rt-rh{margin:0;text-align:center;font:400 clamp(20px,7vw,34px)/1.2 "Press Start 2P","DotGothic16",ui-monospace,monospace;color:#6dff9c;text-shadow:3px 3px 0 #ff5fd2}
.rt-res.over .rt-rh{color:#ff6b8a;text-shadow:3px 3px 0 #232c7a}
.rt-rank{display:flex;align-items:center;justify-content:center;gap:14px}
.rt-rank small{font:400 .7rem "Press Start 2P",ui-monospace,monospace;color:#ff5fd2}
.rt-rank b{font:400 3.6rem/1 "Press Start 2P",ui-monospace,monospace;color:#ffe14d;text-shadow:4px 4px 0 #ff5fd2,8px 8px 0 #232c7a;animation:rtDrop .6s steps(6) .3s both}
.rt-rank.rS b{color:#fff}
.rt-rs{text-align:center;border:2px solid #4de8ff;border-radius:6px;background:rgba(10,14,42,.9);padding:8px}
.rt-rs small{display:block;font:400 .56rem "Press Start 2P",ui-monospace,monospace;color:#ff5fd2}
.rt-rs b{display:block;font:400 1.7rem/1.3 "Press Start 2P",ui-monospace,monospace;color:#fff;letter-spacing:.06em}
.rt-rs em{display:block;font-style:normal;color:#ffe14d;animation:rtBlink2 .8s steps(2) infinite}
.rt-st{list-style:none;margin:0;padding:8px 12px;border:2px solid #2b3a8c;border-radius:6px;background:rgba(10,14,42,.9);display:flex;flex-direction:column;gap:4px;font-size:.9rem}
.rt-st li{display:flex;justify-content:space-between;gap:10px}
.rt-st span{color:#9fb0ee}
.rt-st b{font-weight:400;color:#fff}
.rt-ms{border:2px solid #ff6b8a;border-radius:6px;background:rgba(10,14,42,.9);padding:8px 10px}
.rt-ms summary{cursor:pointer;color:#ff9db1}
.rt-mr{display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px dashed #2b3a8c;margin-top:8px}
.rt-mrm{flex:none;width:108px}
.rt-mrm .rt-mol{width:100%;height:60px}
.rt-mr b{font-weight:400;color:#ffe14d;font-size:.9rem}
.rt-mr small{display:block;font-size:.74rem;color:#9fe9ff}
.rt-mr p{margin:2px 0 0;font-size:.78rem;color:#dbe6ff}
.rt-mr p em{font-style:normal;color:#6dff9c}
.rt-cf{position:absolute;top:-10px;width:8px;height:8px;z-index:8;pointer-events:none;animation:rtFall 2s steps(24) both}

/* こたえの経路図 */
.rt-mapv{flex:1;min-height:0;display:flex;flex-direction:column}
.rt-mh{flex:none;display:flex;align-items:center;gap:10px;padding:8px}
.rt-mh b{flex:1;font-weight:400;font-size:1rem;color:#ffe14d}
.rt-zoom{display:flex;gap:6px}
.rt-mscroll{flex:1;min-height:0;margin:0 8px;border:2px solid #4de8ff;border-radius:6px;background:#090d2b;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.rt-mwrap{display:inline-block;vertical-align:top}
.rt-mwrap svg{display:block}
.rt-mwrap .rt-n,.rt-mwrap .rt-e{cursor:pointer}
.rt-mwrap .rt-n.sel .rt-nr{stroke:#ffe14d;stroke-width:4}
.rt-mwrap .rt-e.sel path{stroke:#ffe14d}
.rt-mwrap .rt-e.sel polygon{fill:#ffe14d}
.rt-minfo{flex:none;min-height:64px;margin:8px;padding:8px 10px;border:2px solid #2b3a8c;border-radius:6px;background:rgba(10,14,42,.92);font-size:.84rem;color:#dbe6ff}
.rt-minfo b{font-weight:400;color:#ffe14d}
.rt-minfo em{font-style:normal;color:#6dff9c}

@keyframes rtBob{0%{transform:translateY(0)}100%{transform:translateY(-3px)}}
@keyframes rtBlink2{0%{opacity:1}100%{opacity:.35}}
@keyframes rtBlinkS{0%{opacity:1}100%{opacity:.4}}
@keyframes rtFlow{to{stroke-dashoffset:-14}}
@keyframes rtFlash{0%{opacity:.95}100%{opacity:0}}
@keyframes rtDrop{0%{opacity:0;transform:translateY(-22px)}100%{opacity:1;transform:none}}
@keyframes rtUp{0%{opacity:0;transform:translate(-50%,10px)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-34px)}}
@keyframes rtShake{0%,100%{transform:none}25%{transform:translateX(-6px)}50%{transform:translateX(6px)}75%{transform:translateX(-3px)}}
@keyframes rtRun{0%{left:6%}45%{left:84%}50%{left:84%}95%{left:6%}100%{left:6%}}
@keyframes rtFall{0%{transform:translateY(0)}100%{transform:translateY(105vh)}}
@media (min-width:900px) and (min-aspect-ratio:5/4){
  .rt-root{max-width:1240px}
  .rt-play{display:grid;grid-template-columns:minmax(0,1fr) 410px;grid-template-rows:auto auto auto auto minmax(0,1fr);overflow:hidden}
  .rt-hud{grid-column:1/3}
  .rt-view{grid-column:1;grid-row:2/6;margin:4px 4px 10px 8px}
  .rt-q{grid-column:2;grid-row:2;margin:4px 8px 0 4px;min-height:96px}
  .rt-time{grid-column:2;grid-row:3;margin:8px 8px 8px 4px}
  .rt-ops{grid-column:2;grid-row:4;padding:0 8px 0 4px}
  .rt-foot{grid-column:2;grid-row:5;align-items:flex-start;padding:10px 8px 0 4px}
  .rt-op.m{min-height:104px}
  .rt-op.m .rt-mol{height:74px}
}
@media (prefers-reduced-motion:reduce){.rt-e.rev path,.rt-sp svg,.rtb-ic,.rtb-go,.rt-dsp,.rt-dsp svg{animation:none}}
html.xv-lite .rt-e.rev path,html.xv-lite .rt-sp svg,html.xv-lite .rt-dsp,html.xv-lite .rt-dsp svg{animation:none}
html.xv-lite .mclrt::after{display:none}
`;
  function css() { if ($("#mclRtCss")) return; const st = document.createElement("style"); st.id = "mclRtCss"; st.textContent = CSS; document.head.appendChild(st); }
  /* ドット文字のフォント（ゲームを開いたときに読む。オフラインで取れなければ、等幅の字で出る） */
  function font() {
    if ($("#mclRtFont")) return;
    const l = document.createElement("link"); l.id = "mclRtFont"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=DotGothic16&family=Press+Start+2P&display=swap";
    document.head.appendChild(l);
  }

  /* ══════════════ 音（WebAudio の矩形波＝ファミコン風）══════════════
     効果音はアプリの設定「効果音」に合わせる。BGM は画面の ♪ で切る（mcl_rt_bgm＝この端末だけ）。 */
  let AC = null, bgmT = 0, bgmStep = 0;
  const soundOn = () => { try { return !!M.get().set.sound; } catch (e) { return false; } };
  const bgmOn = () => { try { return localStorage.getItem("mcl_rt_bgm") !== "0"; } catch (e) { return true; } };
  function actx() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); return AC; } catch (e) { return null; } }
  function note(f, t, d, type, vol) {
    if (!AC || !f) return;
    try {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type || "square"; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + d * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) {}
  }
  function seq(list, type, vol) {
    if (!soundOn()) return;
    const a = actx(); if (!a) return;
    let t = a.currentTime + 0.01;
    list.forEach((n) => { note(n[0], t, n[1], type, vol || 0.05); t += n[1]; });
  }
  const SFX = {
    sel: () => seq([[660, 0.04]], "square", 0.035),
    ok: () => seq([[784, 0.06], [988, 0.06], [1319, 0.12]], "square", 0.045),
    ng: () => seq([[196, 0.12], [147, 0.22]], "sawtooth", 0.05),
    hop: () => seq([[392, 0.04], [523, 0.04], [784, 0.06]], "triangle", 0.07),
    combo: (n) => { const k = Math.pow(1.06, Math.min(n, 12)); seq([[880 * k, 0.05], [1175 * k, 0.09]], "square", 0.03); },
    stage: () => seq([[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.09], [784, 0.09], [1047, 0.28]], "square", 0.045),
    start: () => seq([[392, 0.08], [523, 0.08], [659, 0.08], [784, 0.2]], "square", 0.045),
    over: () => seq([[392, 0.16], [330, 0.16], [262, 0.16], [196, 0.42]], "triangle", 0.08),
    clear: () => seq([[523, 0.1], [523, 0.1], [523, 0.1], [659, 0.3], [587, 0.1], [659, 0.1], [784, 0.46]], "square", 0.045),
    tick: () => seq([[1568, 0.03]], "square", 0.025),
  };
  const HZ = (m) => (m ? 440 * Math.pow(2, (m - 69) / 12) : 0);
  /* このゲームのために作った短いくり返し（Am → F → G → E の分散和音） */
  const LEAD = [69, 0, 72, 0, 76, 0, 72, 0, 69, 0, 72, 76, 79, 0, 76, 0, 65, 0, 69, 0, 72, 0, 69, 0, 65, 0, 69, 72, 76, 0, 72, 0,
    67, 0, 71, 0, 74, 0, 71, 0, 67, 0, 71, 74, 79, 0, 74, 0, 64, 0, 68, 0, 71, 0, 76, 0, 74, 0, 72, 0, 71, 0, 68, 0];
  const BASS = [45, 41, 43, 40];
  function bgmStop() { if (bgmT) { clearInterval(bgmT); bgmT = 0; } }
  function bgmStart() {
    bgmStop();
    if (!soundOn() || !bgmOn() || !actx()) return;
    bgmT = setInterval(() => {
      if (!AC || AC.state !== "running" || document.hidden) return;
      const i = bgmStep % LEAD.length, t = AC.currentTime + 0.02;
      if (LEAD[i]) note(HZ(LEAD[i]), t, 0.1, "square", 0.013);
      if (i % 2 === 0) note(HZ(BASS[Math.floor(i / 16)] + (i % 8 === 4 ? 12 : 0)), t, 0.11, "triangle", 0.034);
      bgmStep++;
    }, 118);
  }

  /* ══════════════ 記録・得点 ══════════════ */
  const SC = { base: 100, speed: 100, step: 20, max: 200, stageP: 500, stageC: 100, retry: 50, nomiss: 2000, hardMul: 1.5, life: 500 };
  const LIMIT = { n: 20, h: 12 };
  const pad6 = (n) => String(Math.max(0, Math.round(n || 0))).padStart(6, "0");
  function best() { let b = {}; try { b = M.get().best || {}; } catch (e) {} return { n: b.rtN || 0, h: b.rtH || 0, c: b.rtC || 0, p: b.rtP || 0, ok: b.rtOk || 0 }; }
  /* ランク：HARD は得点 1.5倍ぶんを割りもどして、NORMAL と同じものさしで */
  function rankOf(score, mode) { const v = mode === "h" ? score / SC.hardMul : score; return v >= 22000 ? "S" : v >= 17000 ? "A" : v >= 12000 ? "B" : v >= 7000 ? "C" : "D"; }
  function saveBest(g) {
    if (window.__MCL_RT_NOSAVE || g.practice) return false;
    let rec = false;
    try {
      M.mut((s) => {
        s.best = s.best || {};
        const k = g.mode === "h" ? "rtH" : "rtN";
        if (g.score > (s.best[k] || 0)) { s.best[k] = g.score; rec = true; }
        s.best.rtC = Math.max(s.best.rtC || 0, g.maxCombo);
        s.best.rtP = (s.best.rtP || 0) + 1;
        if (g.mode !== "h") s.best.rtOk = Math.max(s.best.rtOk || 0, g.ok);
      });
    } catch (e) {}
    return rec;
  }

  /* ══════════════ 画面の土台 ══════════════ */
  let G = null, VIEW = null;      /* G＝進行中のゲーム／VIEW＝こたえの経路図を見ている */
  let tmr = [], raf = 0, tick = 0, banDone = null;
  const later = (fn, ms) => { const id = setTimeout(() => { tmr = tmr.filter((x) => x !== id); fn(); }, ms); tmr.push(id); return id; };
  const clearLater = () => { tmr.forEach(clearTimeout); tmr = []; };
  function stopTimer() { if (tick) { clearInterval(tick); tick = 0; } }
  function stopAll() { clearLater(); stopTimer(); cancelAnimationFrame(raf); raf = 0; bgmStop(); banDone = null; }
  const LOGO = (t) => Array.from(t).map((ch, i) => (ch === " " ? " " : '<span style="animation-delay:' + (i * 0.05).toFixed(2) + 's">' + ch + "</span>")).join("");
  function root() {
    css(); font();
    let el = $("#mclRt");
    if (!el) {
      el = document.createElement("div"); el.id = "mclRt"; el.className = "mclrt"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "ケミカル・ルート（反応経路スコアアタック）");
      el.innerHTML = '<div class="rt-root" id="rtRoot"></div>'; document.body.appendChild(el);
    }
    /* いちど描かせてから on（フェードイン）。requestAnimationFrame は画面が裏だと来ないことがあるので使わない */
    if (el.hidden || !el.classList.contains("on")) { el.hidden = false; void el.offsetWidth; el.classList.add("on"); }
    document.body.classList.add("rt-open");
    return $("#rtRoot");
  }
  function open() { title(); }
  function close() {
    stopAll(); G = null; VIEW = null;
    const el = $("#mclRt"); if (!el) return;
    el.classList.remove("on"); document.body.classList.remove("rt-open");
    setTimeout(() => { if (!el.classList.contains("on")) { el.hidden = true; const r = $("#rtRoot"); if (r) r.innerHTML = ""; } }, 230);
    try { if (U.tab === "home") U.go("home", true); } catch (e) {}
  }
  function burst(n) {
    const host = $("#mclRt"); if (!host) return;
    const cols = ["#4de8ff", "#ff5fd2", "#ffe14d", "#6dff9c", "#ffffff"];
    for (let i = 0; i < (n || 40); i++) {
      const p = document.createElement("i"); p.className = "rt-cf";
      p.style.cssText = "left:" + (Math.random() * 100).toFixed(1) + "%;background:" + cols[i % cols.length] + ";animation-delay:" + (Math.random() * 0.5).toFixed(2) + "s;animation-duration:" + (1.4 + Math.random() * 1.2).toFixed(2) + "s";
      host.appendChild(p); setTimeout(() => p.remove(), 3400);
    }
  }

  /* ══ タイトル ══ */
  function title() {
    stopAll(); G = null; VIEW = null;
    const b = best(), r = root();
    const ar = '<span class="rt-dar"><i>？</i></span>';
    r.innerHTML = '<div class="rt-ttl">' +
      '<button class="rt-x" data-a="rtClose" aria-label="閉じる">×</button>' +
      '<div class="rt-logo"><small>MagiChemLex MINI GAME</small><h2>' + LOGO("CHEMICAL") + '</h2><h2 class="l2">' + LOGO("ROUTE") + "</h2><p>反応経路スコアアタック</p></div>" +
      '<div class="rt-demo" aria-hidden="true"><div class="rt-dm">' + molSVG("bz") + ar + molSVG(3) + ar + molSVG(5) + '</div><div class="rt-dsp">' + SPRITE + "</div></div>" +
      '<div class="rt-hi"><span>HI-SCORE</span><b>NORMAL ' + pad6(b.n) + (b.n ? "<i>" + rankOf(b.n, "n") + "</i>" : "") + "</b><b>HARD " + pad6(b.h) + (b.h ? "<i>" + rankOf(b.h, "h") + "</i>" : "") + "</b></div>" +
      '<div class="rt-menu">' +
        '<button class="rt-btn pri" data-a="rtStart" data-m="n"><b>▶ NORMAL</b><small>構造式に名前つき・1問 ' + LIMIT.n + "秒・全" + TOTAL + "問を最後まで</small></button>" +
        '<button class="rt-btn hard" data-a="rtStart" data-m="h"><b>▶ HARD</b><small>構造式だけ・1問 ' + LIMIT.h + "秒・ライフ3・得点 1.5倍</small></button>" +
        '<div class="rt-row"><button class="rt-btn sm" data-a="rtStages"><b>ステージれんしゅう</b></button><button class="rt-btn sm" data-a="rtMap"><b>こたえの経路図</b></button></div>' +
      "</div>" +
      '<details class="rt-how"><summary>あそびかた・得点</summary><ul>' +
        "<li>ベンゼンから出発する<b>反応経路図</b>を、8つのステージで完成させます（矢印 27本＋化合物 23個＝全" + TOTAL + "問）。</li>" +
        "<li>各ステージは2ラウンド。<b>ROUND 1</b>：矢印の試薬・条件を見て、「？」の箱に<b>できる化合物</b>を答えます。<b>ROUND 2</b>：化合物がそろったら矢印の文字をかくすので、<b>加えるもの・条件</b>を答えます（4つの中から・A〜D・1〜4 キーでも）。</li>" +
        "<li>得点：正解 <b>100</b> ＋ 速さ（最大 <b>100</b>）＋ コンボ（1問ごとに +20・最大 <b>+200</b>）。</li>" +
        "<li>ステージをノーミスで <b>+500</b>（ミスありは +100）。全問ノーミスで <b>+2,000</b>。</li>" +
        "<li>NORMAL：まちがえた問題は、ステージの終わりにもう一度（正解で +50）。</li>" +
        "<li>HARD：まちがい・時間切れでライフ −1。0 でゲームオーバー。残ったライフ1つにつき +500。</li>" +
      "</ul></details>" +
      '<p class="rt-cr">' + (b.p ? "あそんだ回数 " + b.p + "・最大コンボ " + b.c : "ベンゼンから 23 の化合物へ。地図を完成させよう！") + "</p></div>";
  }
  function stagesScreen() {
    stopAll(); G = null; VIEW = null;
    root().innerHTML = '<div class="rt-ttl rt-stl"><button class="rt-x" data-a="rtTitle" aria-label="タイトルへもどる">←</button>' +
      '<div class="rt-logo sm"><small>PRACTICE</small><p>ステージれんしゅう</p></div>' +
      '<p class="rt-note">1ステージだけ遊べます（NORMAL のルール・記録は残りません）。</p><div class="rt-stg">' +
      ST.map((s, i) => '<button class="rt-btn st" data-a="rtPrac" data-i="' + i + '"><i>STAGE ' + (i + 1) + "</i><b>" + esc(s.nm) + "</b><small>" + esc(s.sub) + "・" + s.seq.length + "問</small></button>").join("") + "</div></div>";
  }

  /* ══ あそぶ画面 ══ */
  function newGame(mode, stages, practice) {
    stopAll(); VIEW = null;
    G = { mode, practice: !!practice, stages, si: -1, score: 0, combo: 0, maxCombo: 0, ok: 0, asked: 0, lives: mode === "h" ? 3 : 0,
      rev: {}, erev: {}, log: [], miss: [], stMiss: 0, stageBonus: 0, extra: 0, t0: Date.now(), phase: "", cur: null, curE: null, curN: null,
      queue: [], retry: false, retryList: [], sp: { x: 0, y: 0 }, total: stages.reduce((a, i) => a + ST[i].seq.length, 0) };
    if (practice) (ST[stages[0]].need || []).forEach((c) => { G.rev[c] = 1; });
    root().innerHTML = '<div class="rt-play" id="rtPlay">' +
      '<header class="rt-hud"><button class="rt-ib" data-a="rtPause" aria-label="一時停止">Ⅱ</button>' +
        '<div><small>SCORE</small><b id="rtScore">000000</b></div><div><small>STAGE</small><b id="rtStg">1/8</b></div>' +
        '<div><small>COMBO</small><b id="rtCombo">0</b></div><div><small id="rtQl">QUIZ</small><b id="rtQn">01/' + G.total + "</b></div>" +
        '<button class="rt-ib' + (bgmOn() ? "" : " off") + '" data-a="rtBgm" id="rtBgmB" aria-label="BGM の入／切">♪</button></header>' +
      '<div class="rt-view" id="rtView"><div class="rt-cam" id="rtCam"><div id="rtSvg"></div><div class="rt-sp" id="rtSp">' + SPRITE + "</div></div>" +
        '<div class="rt-pop" id="rtPop"></div><div class="rt-ban" id="rtBan" data-a="rtBan" hidden></div></div>' +
      '<div class="rt-q" id="rtQ"></div><div class="rt-time"><i id="rtBar"></i></div><div class="rt-ops" id="rtOps"></div><div class="rt-foot" id="rtFoot"></div>' +
      '<div class="rt-pz" id="rtPz" hidden></div></div>';
    bgmStart();
    nextStage();
  }
  function paint(pops) {
    const box = $("#rtSvg"); if (!box || !G) return;
    box.innerHTML = worldSVG({ rev: G.rev, erev: G.erev, cur: G.curE, curN: G.curN });
    (pops || []).forEach((sel) => { $$(sel, box).forEach((el) => el.classList.add("pop")); });
  }
  function hud() {
    if (!G || !$("#rtScore")) return;
    $("#rtScore").textContent = pad6(G.score);
    $("#rtStg").textContent = G.practice ? "練習" : (G.si + 1) + "/" + G.stages.length;
    $("#rtCombo").textContent = G.combo;
    $("#rtCombo").parentNode.classList.toggle("hot", G.combo >= 5);
    if (G.mode === "h") { $("#rtQl").textContent = "LIFE"; $("#rtQn").innerHTML = '<span class="rt-life">' + "♥".repeat(Math.max(0, G.lives)) + "<s>" + "♥".repeat(3 - Math.max(0, G.lives)) + "</s></span>"; }
    else { $("#rtQl").textContent = G.retry ? "RETRY" : "QUIZ"; $("#rtQn").textContent = String(Math.min(G.asked + (G.phase === "ask" && !G.retry ? 1 : 0), G.total)).padStart(2, "0") + "/" + G.total; }
  }
  function camTo(bb, instant) {
    const v = $("#rtView"), c = $("#rtCam"); if (!v || !c) return;
    const vw = v.clientWidth || 320, vh = v.clientHeight || 200, pad = 16;
    const s = Math.max(0.34, Math.min(1.12, vw / (bb[2] - bb[0] + pad * 2), vh / (bb[3] - bb[1] + pad * 2)));
    let tx = vw / 2 - s * (bb[0] + bb[2]) / 2, ty = vh / 2 - s * (bb[1] + bb[3]) / 2;
    /* 地図の外（何もないところ）は映さない：地図が画面より大きい向きは、はしで止める。小さい向きはまん中に */
    const mx = vw - s * WW, my = vh - s * WH;
    tx = mx < 0 ? Math.max(mx, Math.min(0, tx)) : mx / 2;
    ty = my < 0 ? Math.max(my, Math.min(0, ty)) : my / 2;
    if (instant) c.style.transition = "none";
    c.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) scale(" + s.toFixed(3) + ")";
    if (instant) { void c.offsetWidth; c.style.transition = ""; }
    if (G) G.bb = bb;
  }
  const spot = (nodeId) => ({ x: ND[nodeId].x + NW / 2 - 34, y: ND[nodeId].y - NH / 2 - 27 });
  function spPlace(nodeId) { const el = $("#rtSp"); if (!el || !G) return; G.sp = spot(nodeId); el.style.left = G.sp.x + "px"; el.style.top = G.sp.y + "px"; }
  /* 跳ぶ（見た目だけ。進行は時計で進めるので、画面が裏でも止まらない） */
  function spHop(nodeId) {
    const el = $("#rtSp"); if (!el || !G) return;
    const a = G.sp, b = spot(nodeId), t0 = performance.now(), dur = 520, hgt = 44 + Math.min(50, Math.abs(b.y - a.y) * 0.25);
    G.sp = b;
    cancelAnimationFrame(raf);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      el.style.left = (a.x + (b.x - a.x) * e).toFixed(1) + "px"; el.style.top = (a.y + (b.y - a.y) * e - Math.sin(Math.PI * k) * hgt).toFixed(1) + "px";
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    later(() => { el.style.left = b.x + "px"; el.style.top = b.y + "px"; }, dur + 60);
  }
  function popUp(txt, cls) {
    const host = $("#rtPop"); if (!host) return;
    const p = document.createElement("span"); p.className = "rt-pp " + (cls || ""); p.textContent = txt; host.appendChild(p); setTimeout(() => p.remove(), 1100);
  }
  /* 一時停止のあいだに来た「つぎへ」は、再開してから */
  const flow = (fn) => () => { if (!G) return; if (G.paused) { G.pend = fn; return; } fn(); };
  function banner(t1, t2, ms, done, cls) {
    const b = $("#rtBan"); if (!b || !G) { if (done) done(); return; }
    b.className = "rt-ban " + (cls || ""); b.innerHTML = "<b>" + LOGO(t1) + "</b><span>" + esc(t2) + "</span>"; b.hidden = false;
    G.phase = "ban";
    banDone = () => { banDone = null; b.hidden = true; if (done) done(); };
    later(flow(() => { if (banDone) banDone(); }), ms);
  }
  function skipBan() { if (G && !G.paused && G.phase === "ban" && banDone) { clearLater(); banDone(); } }

  function nextStage() {
    if (!G) return;
    G.si++;
    if (G.si >= G.stages.length) return finish(false);
    const si = G.stages[G.si], S = ST[si];
    /* ROUND 1＝化合物（矢印の文字は見せておく）→ ROUND 2＝矢印（文字をかくして聞く） */
    G.round = "A"; G.qB = S.seq.filter((k) => k.charAt(0) === "e");
    G.qB.forEach((k) => { G.erev[k] = 1; });
    G.queue = S.seq.filter((k) => k.charAt(0) === "c"); G.retry = false; G.retryList = []; G.stMiss = 0; G.curE = null; G.curN = null; G.cur = null;
    paint();
    spPlace(E[S.seq[0]].f);
    $("#rtQ").innerHTML = '<i class="rt-rd">ROUND 1 化合物</i><small>矢印の試薬・条件を見て、「？」にできる化合物を答えよう</small>'; $("#rtQ").className = "rt-q";
    $("#rtOps").innerHTML = ""; $("#rtFoot").innerHTML = "";
    const bar = $("#rtBar"); if (bar) { bar.style.transition = "none"; bar.style.width = "100%"; bar.className = ""; }
    camTo(stageBB(si), G.si === 0);
    hud();
    SFX.start();
    banner("STAGE " + (si + 1), S.nm, 1500, ask, "stage");
  }
  const cpNameH = (cp) => (cp === "bz" ? "ベンゼン" : noH(cp) + esc(CP[cp].nm));
  const labelH = (nodeId) => { const cp = ND[nodeId].cp; return cp === "bz" ? "ベンゼン" : noH(cp) + (G.rev[cp] ? esc(CP[cp].nm) : "？"); };
  /* その化合物へ入ってくる矢印（いまのステージの中から） */
  function inEdge(cp) {
    const seq = ST[G.stages[G.si]].seq;
    return seq.filter((k) => k.charAt(0) === "e" && E[k].t.some((t) => ND[t].cp === cp))[0] || Object.keys(E).filter((k) => E[k].t.some((t) => ND[t].cp === cp))[0];
  }
  function pick3(ans, sim) {
    const out = (sim || []).slice(0, 3);
    if (Math.random() < 0.35) {
      const pool = []; for (let i = 1; i <= 23; i++) if (i !== ans && out.indexOf(i) < 0) pool.push(i);
      out[Math.floor(Math.random() * 3)] = pool[Math.floor(Math.random() * pool.length)];
    }
    return out;
  }
  function rgPick(eid) {
    const e = E[eid], used = {}, ex = {}, out = [];
    used[RG[e.rg].fam] = 1; (e.ex || []).forEach((k) => { ex[k] = 1; });
    const add = (k) => { const r = RG[k]; if (!r || ex[k] || used[r.fam] || out.length >= 3) return; used[r.fam] = 1; out.push(k); };
    shuffle((e.trap || []).slice()).forEach(add);
    shuffle(Object.keys(RG)).forEach(add);
    return out;
  }
  /* いまのラウンドの札（問題文の頭） */
  const RD = () => '<i class="rt-rd' + (G.round === "B" ? " b" : "") + '">' + (G.retry ? "RETRY" : G.round === "B" ? "ROUND 2 加えるもの" : "ROUND 1 化合物") + "</i>";
  function buildQ(key) {
    const limit = LIMIT[G.mode];
    if (key.charAt(0) === "c") {
      const cp = Number(key.slice(1)), eid = inEdge(cp), e = E[eid], ids = shuffle(pick3(cp, CP[cp].sim).concat([cp]));
      const l2 = e.lab[1] ? e.lab[1].replace(/^[（(]|[)）]$/g, "") : "";
      const rg = "<u>" + esc(e.lab[0] + (l2 ? (l2.charAt(0) === "→" ? " " : "・") + l2 : "")) + "</u>";
      const from = e.cp ? labelH(e.f) + " ＋ " + cpNameH(e.cp) + " →" : labelH(e.f) + " ― " + rg + " →";
      return { key, kind: "c", cp, eid, limit, left: limit, used: 0, opts: ids.map((id) => ({ cp: id })), ans: ids.indexOf(cp),
        html: RD() + "<small>" + from + "</small><span>" + noH(cp) + " にできる<b class=\"hl\">化合物</b>は？</span>" };
    }
    const e = E[key];
    if (e.cp) {
      const ids = shuffle(pick3(e.cp, e.sim).concat([e.cp]));
      return { key, kind: "p", eid: key, limit, left: limit, used: 0, opts: ids.map((id) => ({ cp: id })), ans: ids.indexOf(e.cp),
        html: RD() + "<small>" + labelH(e.f) + " ＋ ？ → " + labelH(e.t[0]) + '</small><span>反応させる<b class="hl">相手の化合物</b>は？</span>' };
    }
    const ks = shuffle(rgPick(key).concat([e.rg])), to = e.t.slice().sort((a, b) => ND[a].cp - ND[b].cp);
    return { key, kind: "e", eid: key, limit, left: limit, used: 0, opts: ks.map((k) => ({ rg: k })), ans: ks.indexOf(e.rg),
      html: RD() + "<small>" + labelH(e.f) + " → " + to.map((t) => labelH(t)).join(" ＋ ") + '</small><span>この矢印で<b class="hl">加えるもの・条件</b>は？</span>' };
  }
  const KEYS = ["A", "B", "C", "D"];
  function optsHTML(q) {
    return q.opts.map((o, i) => {
      if (o.cp != null) return '<button class="rt-op m" data-a="rtPick" data-i="' + i + '"><i>' + KEYS[i] + "</i>" + molSVG(o.cp) + (G.mode === "h" ? "" : '<span class="rt-on">' + esc(CP[o.cp].nm) + "</span>") + "</button>";
      const r = RG[o.rg];
      return '<button class="rt-op" data-a="rtPick" data-i="' + i + '"><i>' + KEYS[i] + "</i><b>" + esc(r.t) + "</b>" + (r.s ? "<small>" + esc(r.s) + "</small>" : "") + "</button>";
    }).join("");
  }
  function ask() {
    if (!G) return;
    if (!G.queue.length) {
      if (!G.retry && G.retryList.length) {
        G.retry = true; G.queue = G.retryList.slice(); G.retryList = [];
        $("#rtOps").innerHTML = ""; $("#rtFoot").innerHTML = ""; hud(); SFX.sel();
        banner("RETRY!", "まちがえた " + G.queue.length + " 問を もう一度", 1400, ask, "retry");
        return;
      }
      if (G.round === "A") return roundB();
      return stageClear();
    }
    const key = G.queue.shift();
    /* やり直しのあいだは、その答えを地図からもう一度かくす */
    if (G.retry) { if (key.charAt(0) === "c") delete G.rev[key.slice(1)]; else delete G.erev[key]; }
    const q = buildQ(key);
    G.cur = q; G.phase = "ask";
    G.curE = q.kind === "c" ? null : q.eid; G.curN = q.kind === "c" ? nodesOf(q.cp) : null;
    paint();
    $("#rtQ").innerHTML = q.html; $("#rtQ").className = "rt-q";
    $("#rtOps").innerHTML = optsHTML(q);
    $("#rtFoot").innerHTML = '<span class="rt-hint">' + (G.retry ? "RETRY：正解で +" + SC.retry : U.isTouch ? "" : "A〜D・1〜4 キーでもえらべます") + "</span>";
    camTo(geo(q.eid).bb);
    hud();
    startTimer();
  }
  /* ROUND 2：このステージの矢印の文字をかくして、加えるもの・条件を順に聞く（化合物はもう全部見えている） */
  function roundB() {
    G.round = "B"; G.retry = false; G.retryList = []; G.curE = null; G.curN = null; G.cur = null;
    G.qB.forEach((k) => { delete G.erev[k]; });
    G.queue = G.qB.slice();
    paint();
    spPlace(E[G.qB[0]].f);
    $("#rtQ").innerHTML = "<small>化合物がそろった！ こんどは矢印の文字をかくして聞くよ</small>"; $("#rtQ").className = "rt-q";
    $("#rtOps").innerHTML = ""; $("#rtFoot").innerHTML = "";
    camTo(stageBB(G.stages[G.si]));
    hud(); SFX.sel();
    banner("ROUND 2", "加えるもの・条件は？", 1500, ask, "round");
  }
  function startTimer() {
    stopTimer();
    const q = G.cur; q.t0 = performance.now(); q.lastSec = 99;
    const bar = $("#rtBar"); if (bar) { bar.style.transition = "none"; bar.style.width = "100%"; bar.className = ""; }
    tick = setInterval(() => {
      if (!G || G.phase !== "ask" || G.paused || G.cur !== q) return;
      q.left = Math.max(0, q.limit - ((performance.now() - q.t0) / 1000 + q.used));
      const b = $("#rtBar");
      if (b) { b.style.transition = "width .12s linear"; b.style.width = (q.left / q.limit * 100).toFixed(1) + "%"; b.className = q.left / q.limit < 0.25 ? "low" : ""; }
      if (q.left > 0 && q.left <= 3 && Math.ceil(q.left) !== q.lastSec) { q.lastSec = Math.ceil(q.left); SFX.tick(); }
      if (q.left <= 0) judge(-1);
    }, 100);
  }
  /* 答え合わせ。i＝えらんだ番号（-1＝時間切れ） */
  function judge(i) {
    if (!G || G.phase !== "ask" || G.paused) return;
    const q = G.cur; stopTimer(); G.phase = "fb";
    q.left = i < 0 ? 0 : Math.max(0, q.limit - ((performance.now() - q.t0) / 1000 + q.used));
    const ok = i === q.ans, first = !G.retry;
    let gain = 0, parts = null;
    if (ok) {
      if (first) {
        G.ok++; G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
        const sp = Math.round(SC.speed * q.left / q.limit), cb = Math.min(SC.max, (G.combo - 1) * SC.step);
        parts = [SC.base, sp, cb]; gain = SC.base + sp + cb;
        if (G.mode === "h") gain = Math.round(gain * SC.hardMul);
      } else gain = SC.retry;
      G.score += gain;
    } else if (first) {
      G.combo = 0; G.stMiss++; G.miss.push(q.key);
      if (G.mode === "h") G.lives--; else G.retryList.push(q.key);
    }
    if (first) { G.asked++; G.log.push({ key: q.key, ok, sel: i, t: Math.round((q.limit - q.left) * 10) / 10, gain }); }
    /* 地図に答えを出す（まちがえても正しい答えが入る＝地図は必ず完成する） */
    const e = E[q.eid];
    if (q.kind === "c") G.rev[q.cp] = 1; else G.erev[q.eid] = 1;
    G.curE = null; G.curN = null;
    paint(q.kind === "c" ? nodesOf(q.cp).map((n) => '[data-n="' + n + '"]') : ['[data-e="' + q.eid + '"]']);
    spHop(q.kind === "c" ? (e.t.filter((t) => ND[t].cp === q.cp)[0] || e.t[0]) : e.t[0]); SFX.hop();
    /* 選択肢に ◯✕ */
    $$("#rtOps .rt-op").forEach((b, k) => {
      b.disabled = true; b.classList.add(k === q.ans ? "ok" : k === i ? "ng" : "dim");
      const o = q.opts[k];
      if (o.cp != null && G.mode === "h" && !$(".rt-on", b)) b.insertAdjacentHTML("beforeend", '<span class="rt-on">' + esc(CP[o.cp].nm) + "</span>");
    });
    const judgeHTML = ok
      ? '<span class="rt-j ok">◯ せいかい！ <b>+' + gain + "</b>" + (parts ? " <small>正解" + parts[0] + "・速さ" + parts[1] + (parts[2] ? "・コンボ" + parts[2] : "") + (G.mode === "h" ? "（×1.5）" : "") + "</small>" : "") + "</span>"
      : '<span class="rt-j ng">✕ ' + (i < 0 ? "時間切れ…" : "ざんねん…") + (G.mode === "h" ? " ライフ −1" : first ? " あとでもう一度！" : "") + "</span>";
    let body;
    if (q.kind === "c") { const c = CP[q.cp]; body = "<p><b>" + noH(q.cp) + esc(c.nm) + (c.alt ? "（" + esc(c.alt) + "）" : "") + "</b>　" + esc(c.tip) + "</p>"; }
    else { const ans = e.cp ? cpNameH(e.cp) : esc(RG[e.rg].t + (RG[e.rg].s ? "（" + RG[e.rg].s + "）" : "")); body = "<p>" + (ok ? "" : "正解は <b>" + ans + "</b>。") + "<em>" + esc(e.rx) + "</em>　" + esc(e.tip) + "</p>"; }
    $("#rtQ").innerHTML = judgeHTML + body; $("#rtQ").className = "rt-q fb " + (ok ? "ok" : "ng");
    $("#rtFoot").innerHTML = '<button class="rt-next" data-a="rtNext">' + (G.mode === "h" && G.lives <= 0 ? "けっかへ ▶" : "つぎへ ▶") + "</button>";
    hud();
    if (ok) {
      SFX.ok(); popUp("+" + gain);
      if (first && G.combo >= 3) { popUp(G.combo + " COMBO!", "cb"); later(() => SFX.combo(G.combo), 190); }
      later(flow(next), q.kind === "c" ? 1500 : 1300);
    } else {
      SFX.ng(); popUp(i < 0 ? "TIME UP" : "MISS", "ng");
      const v = $("#rtView"); if (v) { v.classList.remove("shake"); void v.offsetWidth; v.classList.add("shake"); }
    }
  }
  function next() {
    if (!G || G.phase !== "fb" || G.paused) return;
    clearLater(); G.phase = "";
    if (G.mode === "h" && G.lives <= 0) return finish(true);
    ask();
  }
  function stageClear() {
    const perfect = G.stMiss === 0, bonus = perfect ? SC.stageP : SC.stageC;
    G.score += bonus; G.stageBonus += bonus; G.curE = null; G.curN = null; G.cur = null; G.retry = false;
    paint();
    $("#rtQ").innerHTML = '<span class="rt-j ok">' + (perfect ? "ノーミス！" : "ステージクリア！") + " ボーナス <b>+" + bonus + "</b></span><small>" + esc(ST[G.stages[G.si]].sub) + "</small>"; $("#rtQ").className = "rt-q fb ok";
    $("#rtOps").innerHTML = ""; $("#rtFoot").innerHTML = "";
    camTo(stageBB(G.stages[G.si]));
    hud(); SFX.stage(); if (perfect) burst(26);
    banner(perfect ? "PERFECT!" : "STAGE CLEAR", "ボーナス +" + bonus, 2000, nextStage, perfect ? "perfect" : "clear");
  }
  function finish(over) {
    const g = G; stopAll();
    g.phase = "end"; g.over = !!over; g.ms = Date.now() - g.t0; g.extra = 0; g.noMiss = false;
    if (!over && !g.practice) {
      if (!g.miss.length) { g.noMiss = true; g.extra += SC.nomiss; }
      if (g.mode === "h") g.extra += Math.max(0, g.lives) * SC.life;
      g.score += g.extra;
    }
    g.rec = saveBest(g);
    result();
  }
  function missRow(key) {
    if (key.charAt(0) === "c") { const cp = Number(key.slice(1)), c = CP[cp]; return '<div class="rt-mr"><div class="rt-mrm">' + molSVG(cp) + "</div><div><b>" + noH(cp) + esc(c.nm) + "</b><p>" + esc(c.tip) + "</p></div></div>"; }
    const e = E[key], to = e.t.slice().sort((a, b) => ND[a].cp - ND[b].cp);
    const ans = e.cp ? "相手は " + cpNameH(e.cp) : esc(RG[e.rg].t + (RG[e.rg].s ? "（" + RG[e.rg].s + "）" : ""));
    return '<div class="rt-mr"><div><small>' + cpNameH(ND[e.f].cp) + " → " + to.map((t) => cpNameH(ND[t].cp)).join(" ＋ ") + "</small><b>" + ans + "</b><p><em>" + esc(e.rx) + "</em>　" + esc(e.tip) + "</p></div></div>";
  }
  function result() {
    const g = G; if (!g) return title();
    VIEW = null;
    const rk = g.practice || g.over ? "" : rankOf(g.score, g.mode);
    const tm = Math.round(g.ms / 1000), miss = g.miss.filter((k, i) => g.miss.indexOf(k) === i);
    root().innerHTML = '<div class="rt-res' + (g.over ? " over" : "") + '">' +
      '<h2 class="rt-rh">' + LOGO(g.over ? "GAME OVER" : g.practice ? "CLEAR!" : "ALL CLEAR!") + "</h2>" +
      (rk ? '<div class="rt-rank r' + rk + '"><small>RANK</small><b>' + rk + "</b></div>" : "") +
      '<div class="rt-rs"><small>' + (g.practice ? "PRACTICE" : g.mode === "h" ? "HARD" : "NORMAL") + " SCORE</small><b>" + pad6(g.score) + "</b>" + (g.rec ? "<em>NEW RECORD!</em>" : "") + "</div>" +
      '<ul class="rt-st"><li><span>正解</span><b>' + g.ok + " / " + g.asked + (g.over ? "（全" + g.total + "問）" : "") + "</b></li><li><span>最大コンボ</span><b>" + g.maxCombo + "</b></li>" +
        "<li><span>タイム</span><b>" + Math.floor(tm / 60) + ":" + String(tm % 60).padStart(2, "0") + "</b></li><li><span>ステージのボーナス</span><b>+" + nf(g.stageBonus) + "</b></li>" +
        (g.noMiss ? "<li><span>全問ノーミス</span><b>+" + nf(SC.nomiss) + "</b></li>" : "") +
        (g.mode === "h" && !g.over && !g.practice ? "<li><span>のこりライフ ×" + Math.max(0, g.lives) + "</span><b>+" + nf(Math.max(0, g.lives) * SC.life) + "</b></li>" : "") + "</ul>" +
      (miss.length ? '<details class="rt-ms" open><summary>まちがえた問題（' + miss.length + "）</summary>" + miss.map(missRow).join("") + "</details>" : g.asked ? '<p class="rt-note">ノーミス！ すばらしい！</p>' : "") +
      (g.practice ? '<p class="rt-note">れんしゅうの記録は残りません。</p>' : "") +
      '<div class="rt-menu"><button class="rt-btn pri" data-a="rtAgain"><b>▶ もう一度</b></button>' +
        '<div class="rt-row"><button class="rt-btn sm" data-a="rtMap"><b>こたえの経路図</b></button><button class="rt-btn sm" data-a="rtTitle"><b>タイトルへ</b></button></div></div></div>';
    if (g.over) SFX.over(); else { SFX.clear(); burst(g.practice ? 30 : 70); }
  }

  /* ══ 一時停止 ══ */
  function pause() {
    if (!G || G.paused || G.phase === "end" || !$("#rtPlay")) return;
    G.paused = true;
    if (G.phase === "ask" && G.cur) G.cur.used += (performance.now() - G.cur.t0) / 1000;
    bgmStop();
    const p = $("#rtPz"); p.hidden = false;
    p.innerHTML = '<div class="rt-pzb"><h3>PAUSE</h3><button class="rt-btn pri" data-a="rtResume"><b>▶ つづける</b></button>' +
      '<button class="rt-btn sm" data-a="rtTitle"><b>やめてタイトルへ</b></button><p>' + (G.practice ? "" : "やめると、この回の記録は残りません。") + "</p></div>";
  }
  function resume() {
    if (!G || !G.paused) return;
    G.paused = false; if (G.cur) G.cur.t0 = performance.now();
    const p = $("#rtPz"); if (p) { p.hidden = true; p.innerHTML = ""; }
    bgmStart();
    if (G.pend) { const f = G.pend; G.pend = null; f(); }
  }

  /* ══ こたえの経路図（完成した地図を見る・拡大と縮小・箱や矢印をタップで説明）══ */
  const ZS = [0.4, 0.55, 0.7, 0.85, 1, 1.25];
  function mapView() {
    const back = G && G.phase === "end" ? "rtResult" : "rtTitle";
    stopAll();
    VIEW = { z: innerWidth >= 900 ? 3 : 2 };
    root().innerHTML = '<div class="rt-mapv"><header class="rt-mh"><button class="rt-ib" data-a="' + back + '" aria-label="もどる">←</button><b>こたえの経路図</b>' +
      '<span class="rt-zoom"><button class="rt-ib" data-a="rtZoom" data-d="-1" aria-label="小さく">−</button><button class="rt-ib" data-a="rtZoom" data-d="1" aria-label="大きく">＋</button></span></header>' +
      '<div class="rt-mscroll" id="rtMs"><div class="rt-mwrap" id="rtMw">' + worldSVG({ all: 1 }) + "</div></div>" +
      '<div class="rt-minfo" id="rtMi">箱や矢印をタップすると、説明が出ます。指で動かせます（−／＋ で大きさ）。</div></div>';
    zoom(0);
  }
  function zoom(d) {
    if (!VIEW) return;
    const svg = $("#rtMw svg"); if (!svg) return;
    VIEW.z = Math.max(0, Math.min(ZS.length - 1, VIEW.z + d));
    svg.setAttribute("width", Math.round(WW * ZS[VIEW.z])); svg.setAttribute("height", Math.round(WH * ZS[VIEW.z]));
  }
  function mapInfo(el) {
    const box = $("#rtMi"); if (!box) return;
    $$("#rtMw .sel").forEach((x) => x.classList.remove("sel")); el.classList.add("sel");
    if (el.dataset.n) {
      const cp = ND[el.dataset.n].cp;
      box.innerHTML = cp === "bz" ? "<b>ベンゼン</b>　すべての出発点。同じベンゼンを点線でつないであります。" : "<b>" + noH(cp) + esc(CP[cp].nm) + (CP[cp].alt ? "（" + esc(CP[cp].alt) + "）" : "") + "</b>　" + esc(CP[cp].tip);
    } else {
      const e = E[el.dataset.e], to = e.t.slice().sort((a, b) => ND[a].cp - ND[b].cp);
      box.innerHTML = "<b>" + cpNameH(ND[e.f].cp) + (e.cp ? " ＋ " + cpNameH(e.cp) : "") + " → " + to.map((t) => cpNameH(ND[t].cp)).join(" ＋ ") + "</b><br>" +
        (e.cp ? "" : esc(RG[e.rg].t + (RG[e.rg].s ? "（" + RG[e.rg].s + "）" : "")) + "　") + "<em>" + esc(e.rx) + "</em>　" + esc(e.tip);
    }
  }

  /* ══ ホームの入口（ビンゴのすぐ下）══ */
  function bannerHTML() {
    css();
    const b = best(), hi = Math.max(b.n, b.h);
    return '<button class="rtb" data-a="rtOpen"><span class="rtb-ic" aria-hidden="true">' + SPRITE + "</span>" +
      '<span class="rtb-t"><small>CHEMICAL ROUTE' + (b.p ? "" : "<i>NEW</i>") + "</small><b>反応経路スコアアタック</b><em>ベンゼンから23の化合物へ・全" + TOTAL + "問" +
      (hi ? "・ハイスコア <b>" + nf(hi) + "</b>" : "・レトロゲーム風のミニゲーム") + "</em></span>" +
      '<span class="rtb-go">▶ START</span></button>';
  }

  /* ══ 操作 ══ */
  const A = U.act;
  A.rtOpen = () => { SFX.sel(); open(); };
  A.rtClose = () => close();
  A.rtTitle = () => { SFX.sel(); title(); };
  A.rtStages = () => { SFX.sel(); stagesScreen(); };
  A.rtStart = (el) => { newGame(el.dataset.m === "h" ? "h" : "n", ST.map((s, i) => i), false); };
  A.rtPrac = (el) => { newGame("n", [Number(el.dataset.i) || 0], true); };
  A.rtAgain = () => { const g = G; if (g) newGame(g.mode, g.stages, g.practice); else title(); };
  A.rtPick = (el) => { judge(Number(el.dataset.i)); };
  A.rtNext = () => next();
  A.rtBan = () => skipBan();
  A.rtPause = () => pause();
  A.rtResume = () => resume();
  A.rtMap = () => { SFX.sel(); mapView(); };
  A.rtResult = () => { SFX.sel(); result(); };
  A.rtZoom = (el) => zoom(Number(el.dataset.d) || 0);
  A.rtBgm = () => {
    const on = !bgmOn();
    try { localStorage.setItem("mcl_rt_bgm", on ? "1" : "0"); } catch (e) {}
    const b = $("#rtBgmB"); if (b) b.classList.toggle("off", !on);
    if (on && G && !G.paused) bgmStart(); else bgmStop();
    if (on && !soundOn()) U.toast("設定の「効果音」がオフのあいだは、BGM も鳴りません");
  };
  document.addEventListener("click", (e) => { const el = e.target.closest("#rtMw .rt-n, #rtMw .rt-e"); if (el) mapInfo(el); });
  document.addEventListener("keydown", (e) => {
    if (!document.body.classList.contains("rt-open") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (U.sheetOpen && U.sheetOpen()) return;
    const k = e.key;
    if (k === "Escape") {
      e.preventDefault();
      if (G && G.phase !== "end" && $("#rtPlay")) { if (G.paused) resume(); else pause(); }
      else if (VIEW) { if (G && G.phase === "end") result(); else title(); }
      else if ($(".rt-stl") || $(".rt-res")) title();
      else close();
      return;
    }
    if (!G || G.paused) return;
    if (G.phase === "ask") {
      const i = "1234".indexOf(k) >= 0 ? "1234".indexOf(k) : k.length === 1 ? "abcd".indexOf(k.toLowerCase()) : -1;
      if (i >= 0 && i < G.cur.opts.length) { e.preventDefault(); judge(i); }
    } else if (k === "Enter" || k === " ") {
      if (G.phase === "fb") { e.preventDefault(); next(); } else if (G.phase === "ban") { e.preventDefault(); skipBan(); }
    }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && G && $("#rtPlay") && (G.phase === "ask" || G.phase === "fb" || G.phase === "ban")) pause(); });
  window.addEventListener("resize", () => { if (G && G.bb && $("#rtCam")) camTo(G.bb, true); });

  window.MCLRoute = { open, close, bannerHTML, CP, RG, E, ST, TOTAL, molSVG, worldSVG,
    /* 確かめる用：いまの問題と正解の番号／えらぶ／つぎへ／帯を飛ばす */
    _peek: () => (G ? { phase: G.phase, key: G.cur && G.cur.key, kind: G.cur && G.cur.kind, ans: G.cur ? G.cur.ans : -1, score: G.score, combo: G.combo, si: G.si, asked: G.asked, ok: G.ok, lives: G.lives, retry: G.retry, round: G.round, paused: !!G.paused, over: !!G.over, rec: !!G.rec, left: G.cur ? G.cur.left : 0 } : null),
    _pick: (i) => judge(i), _next: () => next(), _skip: () => skipBan() };
  /* 読みこみの順番で、ホームがこのファイルより先に描かれていたら描き直す（入口を出す） */
  if (document.readyState !== "loading" && U.tab === "home" && !document.querySelector(".rtb")) { try { U.go("home", true); } catch (e) {} }
})();
