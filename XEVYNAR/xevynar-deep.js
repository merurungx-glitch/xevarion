/* ============================================================
   XEVYNAR — 1問ごとの「くわしい解説」（2026-08-18 新規）
   ------------------------------------------------------------
   何をするものか
     MagiLex の 数学・物理・化学γ の<b>1問1問</b>について、
     MagiLex の答えの下に出る短い解説（extra）より<b>ずっと詳しい</b>解説を組み立てる。

       ① この問題は何を聞かれているか（与えられたもの／求めるもの）
       ② 方針（reading をふくらませ、合う定石を当てる）
       ③ 使う道具（公式カード）
       ④ 手順（extra を1行ずつに割り、行ごとに用語と公式をぶら下げる）
       ⑤ 図・グラフ（XVFigs が問題文から選ぶ）
       ⑥ 答えの確かめかた
       ⑦ ほかの選択肢がなぜ違うか（誤答1つずつに理由）
       ⑧ つまずいた用語 → やさしい例題 → もう少し難しい例題（XVTerms）
       ⑨ 同じセットの類題

     ★ ①〜⑨は<b>その問題のデータから組み立てる</b>ので、対象の全問（970問）に必ず出る。
     ★ そのうえで、特に手厚くしたい問題は NOTES に手書きの解説を足せる（上書きされる）。

   使いかた
     XVDeep.load()          … MagiLex の問題データを読む（遅延読込・2回目は即返る）
     XVDeep.sets(sub)       … 対象のセット一覧（sub: math/phys/chem 省略で全部）
     XVDeep.get(sid, qi)    … 生の問題
     XVDeep.build(sid, qi)  … くわしい解説（下の形）
     XVDeep.note(sid, qi)   … 手書きの上書きがあれば返す

   ★ 手書きを足すときは NOTES に "sid#qi" のキーで
     { ask, plan, steps:[{t,d}], check, figs:[figId], traps:[] } を書く（どれも任意）。
   ============================================================ */
(function () {
  "use strict";

  /* MagiLex の問題データ。XVLex より広く読む（数学・物理・化学γが別ファイルにあるため）。 */
  const SRC = [
    "../MagiLex/magilex-data.js",
    "../MagiLex/magilex-eigo.js",
    "../MagiLex/magilex-rika.js",
    "../MagiLex/magilex-chemb.js",
    "../MagiLex/magilex-suugaku.js",
    "../MagiLex/magilex-intro.js",
    "../MagiLex/magilex-mid.js",
    "../MagiLex/magilex-math3.js",
    "../MagiLex/magilex-chemg.js",
    "../MagiLex/magilex-chemd.js",
    "../MagiLex/magilex-physb.js",
    "../MagiLex/magilex-butsuri.js",
  ];
  let loading = null, loaded = false;
  function inject(src) {
    return new Promise((res) => {
      const s = document.createElement("script");
      s.src = src; s.onload = () => res(true); s.onerror = () => res(false);
      document.head.appendChild(s);
    });
  }
  function load() {
    if (loaded) return Promise.resolve(true);
    if (loading) return loading;
    loading = (async () => {
      for (const s of SRC) await inject(s);      /* 依存があるので順番に */
      loaded = !!(window.LEX_SECTIONS && window.LEX_SECTIONS.length);
      return loaded;
    })();
    return loading;
  }
  function sections() { return window.LEX_SECTIONS || []; }

  /* ── 科目の見分け（MagiLex の id の接頭辞と同じ規則） ── */
  function subOf(sid) {
    if (/^math_/.test(sid)) return "math";
    if (/^physb_/.test(sid)) return "phys";   /* ★ 2026-08-20 物理β */
    if (/^phys_/.test(sid)) return "phys";
    if (/^cgamma_/.test(sid)) return "chem";
    if (/^cdelta_/.test(sid)) return "chem";   /* ★ 2026-08-20 化学δ */
    return "";
  }
  const SUB_NM = { math: "数学", phys: "物理", chem: "化学" };
  /* 難易度（MagiLex の diffOf と同じ線引き） */
  function diffOf(sid, nm) {
    if (/最難関|難問/.test(nm || "")) return 5;
    /* ★ 2026-08-19 中堅（MagiLex の diffOf と同じ線引き）。
       math_ / phys_ / cgamma_ より<b>前</b>に置くこと。 */
    if (/_mid$/.test(sid) || /^phys_mid_/.test(sid)) return 3;
    /* ★ 2026-08-19 入門 */
    if (/_intro$/.test(sid) || /^phys_intro_/.test(sid)) return 2;
    /* ★ 2026-08-20 物理β。"_adv" で終わるものだけが最難関。 */
    if (/^physb_/.test(sid)) return /_adv$/.test(sid) ? 5 : 4;
    /* ★ 2026-08-20 化学δ。"_adv" で終わるものだけが最難関。 */
    if (/^cdelta_/.test(sid)) return /_adv$/.test(sid) ? 5 : 4;
    if (/^cgamma_[oi]_/.test(sid) || /^phys_adv_/.test(sid) || /^math_c3_/.test(sid)) return 5;
    if (/^cgamma_s_/.test(sid) || /^math_/.test(sid)) return 4;
    if (/^phys_/.test(sid)) return 3;
    return 3;
  }
  const DIFF_NM = { 5: "最難関", 4: "難関", 3: "中堅", 2: "入門" };

  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-20 くわしい解説の対象は<b>最難関だけ</b>

     これまでは 数学・物理・化学 の全問（970問超）に解説を出していた。
     だが入門・中堅・難関には、答えの下の解説（extra）と解法タブがある。
     解説を広く薄く配るより、<b>いちばん重い問題を深く</b>のほうが効くので、
     ここで難易度5だけにしぼる。
     ★ MagiLex 側（isDeepTarget）とかならず同じ線引きにすること。
     ══════════════════════════════════════════════════════════════ */
  const DEEP_LV = 5;
  function isDeep(sid, nm) { return diffOf(sid, nm) === DEEP_LV; }
  /* 対象（数学・物理・化学の最難関）のセット一覧 */
  function sets(sub) {
    return sections().filter((s) => {
      const k = subOf(s.id);
      if (!k || (sub && k !== sub)) return false;
      return isDeep(s.id, s.name);
    }).map((s) => ({
      sid: s.id, nm: s.name, icon: s.icon || "📘", sub: subOf(s.id), subNm: SUB_NM[subOf(s.id)],
      desc: s.desc || "", n: (s.questions || []).length, lv: diffOf(s.id, s.name),
      lvNm: DIFF_NM[diffOf(s.id, s.name)] || "",
    }));
  }
  function secOf(sid) { return sections().find((s) => s.id === sid) || null; }
  function get(sid, qi) {
    const sec = secOf(sid); if (!sec) return null;
    const q = (sec.questions || [])[qi]; if (!q) return null;
    return {
      sid, qi, secNm: sec.name, icon: sec.icon || "📘", sub: subOf(sid), subNm: SUB_NM[subOf(sid)] || "",
      lv: diffOf(sid, sec.name), lvNm: DIFF_NM[diffOf(sid, sec.name)] || "",
      stem: q.stem || "", reading: q.reading || "", answer: q.answer || "",
      wrong: (q.wrong || []).slice(), extra: q.extra || "",
      total: (sec.questions || []).length,
    };
  }

  /* ══════════════════════════════════════════════════════════
     ① 何を聞かれているか
     ══════════════════════════════════════════════════════════ */
  /* 「〜は？」「〜を求めよ」の直前が、たいてい求めるもの。 */
  function askOf(q) {
    const s = q.stem;
    let want = "";
    let m = /([^、。？\s]{2,24})(?:の値)?(?:は|を)(?:\s*)(?:？|\?|求めよ|求めなさい|示せ|答えよ)/.exec(s);
    if (m) want = m[1];
    if (!want) { m = /([^、。？\s]{2,24})は？$/.exec(s.trim()); if (m) want = m[1]; }
    /* 与えられている条件＝「、」で切ったうち、問いかけの部分を除いたもの */
    const parts = s.replace(/[？?]$/, "").split(/[、,]/).map((x) => x.trim()).filter(Boolean);
    const given = parts.filter((p) => !/は$|は？|求め|答え|示せ/.test(p)).slice(0, 5);
    return { want: want || "問題文の最後にある量", given };
  }

  /* ══════════════════════════════════════════════════════════
     ② 方針 ＋ ③ 使う道具
     ══════════════════════════════════════════════════════════ */
  function methodsFor(q) {
    const S = window.XVSteps; if (!S) return [];
    const text = [q.secNm, q.stem, q.reading, q.extra].join(" ");
    return S.find(text, 2);
  }
  function formsFor(q, ms) {
    const S = window.XVSteps; if (!S) return [];
    const seen = {}, out = [];
    (ms || []).forEach((m) => S.formsOf(m).forEach((f) => { if (!seen[f.id]) { seen[f.id] = 1; out.push(f); } }));
    /* 定石から取れないときは、公式の名前が問題文に出ていないかで拾う */
    if (!out.length) {
      const t = norm([q.stem, q.reading, q.extra].join(" "));
      S.formulas().forEach((f) => {
        if (out.length >= 3) return;
        if (t.indexOf(norm(f.nm)) >= 0 || (f.topic && t.indexOf(norm(f.topic)) >= 0)) out.push(f);
      });
    }
    return out.slice(0, 4);
  }

  /* ══════════════════════════════════════════════════════════
     ④ 手順 — extra を1行ずつに割る
     ══════════════════════════════════════════════════════════ */
  /* 「。」で切る。ただし「0.5」のような小数点や「A.B」で切らないようにする。 */
  function splitSteps(extra) {
    const t = String(extra || "").trim();
    if (!t) return [];
    /* ★ 後読み(?<=)は古い iOS Safari が知らないので使わない。
       「。」の直後で切る処理を、手で書く。 */
    const raw = [];
    let buf = "";
    for (let i = 0; i < t.length; i++) {
      buf += t[i];
      if (t[i] === "。") { raw.push(buf); buf = ""; }
    }
    if (buf.trim()) raw.push(buf);
    const out = [];
    raw.forEach((r) => {
      r = r.trim();
      if (!r) return;
      /* 1文が長すぎるときは「→」「、よって」でもう一段割る（読み下せる大きさにする） */
      if (r.length > 70 && /→/.test(r)) {
        r.split(/(?=→)/).forEach((p) => { if (p.trim()) out.push(p.trim()); });
      } else out.push(r);
    });
    return out;
  }
  /* 手順1つに、そこで出てくる用語と公式をぶら下げる */
  function stepDetail(text, q) {
    const T = window.XVTerms;
    const S = window.XVSteps;
    const terms = T ? T.find(text, 2) : [];
    let forms = [];
    if (S) {
      const t = norm(text);
      S.formulas(q.sub === "chem" ? "chem" : q.sub === "phys" ? "phys" : "math").forEach((f) => {
        if (forms.length >= 2) return;
        if (t.indexOf(norm(f.nm)) >= 0) forms.push(f);
      });
    }
    return { text, terms, forms };
  }

  /* ══════════════════════════════════════════════════════════
     ⑥ 答えの確かめかた（答えの形から言えることを出す）
     ══════════════════════════════════════════════════════════ */
  function checksOf(q) {
    const a = String(q.answer), out = [];
    if (/km\/h|m\/s|\bN\b|\bJ\b|\bW\b|\bV\b|\bA\b|Ω|\bC\b|mol|\bg\b|\bL\b|Pa|\bK\b|秒|°/.test(a))
      out.push("<b>単位</b>がそろっているか。式のなかで長さは m、時間は s、質量は kg にそろえてから代入する（mL や分のままだと桁がずれる）。");
    if (/^−|^-/.test(a) || /[−-]/.test(a))
      out.push("<b>符号</b>が向きと合っているか。最初に決めた「正の向き」を、最後まで変えていないか見直す。");
    if (/√/.test(a)) out.push("<b>√を外し忘れ</b>ていないか。2乗のまま答えていないかを見る。");
    if (/π/.test(a)) out.push("<b>π</b>が付いているか（面積・体積・回転体では落としやすい）。");
    if (/\//.test(a)) out.push("<b>分母と分子</b>が逆になっていないか。単位を書いてみると向きが分かる。");
    if (q.sub === "chem") out.push("<b>mol に直してから</b>計算したか。最後に mol を質量や体積へ戻したか。");
    if (q.sub === "phys") out.push("極端な場合（質量を0にする・角を0°や90°にする）を入れて、<b>常識に合う答え</b>になるか試す。");
    if (q.sub === "math") out.push("求めた値を<b>もとの式に代入</b>して、本当に成り立つかを確かめる。");
    out.push("問題が<b>範囲</b>（0≦x<2π、x>0、自然数など）を指定していれば、その中に入っているか。");
    return out.slice(0, 4);
  }

  /* ══════════════════════════════════════════════════════════
     ⑦ ほかの選択肢がなぜ違うか
     ══════════════════════════════════════════════════════════
     数で書かれている選択肢は、正解との関係（2倍・半分・逆数・符号ちがい・2乗）が
     そのまま「どこで間違えたか」を表している。そこを言葉にして返す。 */
  function numOf(s) {
    const t = String(s).replace(/[，,\s]/g, "");
    const m = /^-?−?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?$/.exec(t.replace(/−/g, "-"));
    if (!m) return null;
    const v = t.replace(/−/g, "-");
    if (v.indexOf("/") > 0) { const p = v.split("/"); const n = parseFloat(p[0]), d = parseFloat(p[1]); return d ? n / d : null; }
    const n = parseFloat(v);
    return isFinite(n) ? n : null;
  }
  function near(a, b) { return Math.abs(a - b) < Math.max(1e-9, Math.abs(b) * 1e-6); }
  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-19 「その選択肢は<b>何なのか</b>」を言う

     とくに化学では、まちがいの選択肢は<b>別の実在するもの</b>であることが多い。
     「ちがいます」だけでは学びにならないので、
     <b>それが何に当てはまるのか</b>を辞書から引いて添える。
     ★ 足すときは WHAT_IS に1行。左が選択肢の書かれかた、右がその正体。
     ══════════════════════════════════════════════════════════════ */
  const WHAT_IS = {
    /* ── 有機：官能基の検出 ── */
    "ヨードホルム反応": "CH₃CO− または CH₃CH(OH)− を見つける反応です（黄色い沈殿）。",
    "銀鏡反応": "アルデヒド（−CHO）を見つける反応です。",
    "フェーリング反応": "アルデヒド（と還元糖）を見つける反応です（赤色沈殿）。",
    "ビウレット反応": "ペプチド結合が2つ以上（＝タンパク質）を見つける反応です（赤紫）。",
    "キサントプロテイン反応": "ベンゼン環をもつタンパク質を見つける反応です（黄色→橙）。",
    "ニンヒドリン反応": "アミノ基（アミノ酸・タンパク質）を見つける反応です（紫）。",
    /* ── 有機：物質 ── */
    "アセトン": "第二級アルコール（2-プロパノール）を酸化して得られる<b>ケトン</b>です。",
    "アセトアルデヒド": "エタノール（第一級）を穏やかに酸化して得られる<b>アルデヒド</b>です。",
    "酢酸": "アセトアルデヒドをさらに酸化して得られる<b>カルボン酸</b>です。",
    "酢酸エチル": "酢酸とエタノールから水がとれてできる<b>エステル</b>です。",
    "エチレン": "エタノールを高温（約170℃）で脱水して得られる<b>アルケン</b>です。",
    "ジエチルエーテル": "エタノールを低温（約130℃）で脱水して得られる<b>エーテル</b>です。",
    "ニトロベンゼン": "ベンゼンを<b>ニトロ化</b>して得られるものです。還元するとアニリンになります。",
    "アニリン": "ニトロベンゼンを<b>還元</b>して得られる<b>塩基性</b>の物質です。",
    "フェノール": "−OH がベンゼン環に直接ついたもの。塩化鉄(III)で<b>紫に呈色</b>します。",
    "安息香酸": "ベンゼン環に −COOH がついた<b>カルボン酸</b>です。",
    "サリチル酸": "−OH と −COOH を<b>両方</b>もつので、フェノールとカルボン酸の反応が<b>どちらも</b>起きます。",
    "グリセリン": "油脂をけん化したときに、セッケンといっしょにできる<b>3価アルコール</b>です。",
    "セッケン": "油脂を強塩基で加水分解（けん化）して得られる、脂肪酸の塩です。",
    /* ── 無機 ── */
    "同位体": "<b>同じ元素で中性子の数がちがう</b>原子どうしのことです（同素体とは別）。",
    "同素体": "<b>同じ元素からできた、性質のちがう単体</b>どうしのことです。",
    "異性体": "<b>分子式は同じで構造がちがう</b>化合物どうしのことです。",
    "同族体": "同じ官能基をもち、CH₂ ずつちがう化合物の並びのことです。",
    "水上置換": "<b>水に溶けにくい</b>気体の集めかたです。",
    "上方置換": "<b>水に溶けて、空気より軽い</b>気体の集めかたです（ほぼ NH₃ だけ）。",
    "下方置換": "<b>水に溶けて、空気より重い</b>気体の集めかたです。",
    "不動態": "濃硝酸などで表面に緻密な酸化被膜ができ、内部が守られる状態のことです（Al・Fe・Ni）。",
    "両性元素": "酸にも強塩基にも溶ける元素（Al・Zn・Sn・Pb）のことです。",
    /* ── 理論 ── */
    "触媒": "反応を<b>速くする</b>だけで、平衡の位置は動かしません。",
    "ルシャトリエの原理": "加えた変化を<b>やわらげる向き</b>へ平衡が動く、という決まりです。",
    "緩衝液": "弱酸とその塩が両方あり、少しの酸・塩基では pH が動かない溶液です。",
    /* ── 数学・物理でよく出る取りちがえ ── */
    "順列": "<b>並べる順番を区別する</b>数えかた（ₙPᵣ）です。",
    "組合せ": "<b>並べる順番を区別しない</b>数えかた（ₙCᵣ）です。",
    "縦波": "媒質が<b>進む向きと同じ向き</b>に振動する波です（音がこれ）。",
    "横波": "媒質が<b>進む向きと垂直</b>に振動する波です（光がこれ）。",
    "実像": "光が実際に集まってできる像で、<b>逆向き</b>です。",
    "虚像": "光が集まってはいない像で、<b>同じ向き</b>です。",
  };
  /* 選択肢の文字列から「それが何か」を引く（部分一致・長いものを先に） */
  const WHAT_KEYS = Object.keys(WHAT_IS).sort((a, b) => b.length - a.length);
  function whatIs(s) {
    const t = String(s || "");
    for (const k of WHAT_KEYS) if (t.indexOf(k) >= 0) return WHAT_IS[k];
    return "";
  }
  /* 化学式・分子式のちがいを言葉にする（C₆H₁₂O₆ と C₃H₆O₃ など） */
  const SUB = { "₀": 0, "₁": 1, "₂": 2, "₃": 3, "₄": 4, "₅": 5, "₆": 6, "₇": 7, "₈": 8, "₉": 9 };
  function formulaCounts(s) {
    const t = String(s || "");
    if (!/^[A-Za-z₀-₉0-9()]+$/.test(t)) return null;
    const o = {}; let ok = false;
    t.replace(/([A-Z][a-z]?)([₀-₉0-9]*)/g, (m0, el, n) => {
      let v = 0;
      if (!n) v = 1;
      else if (/[₀-₉]/.test(n)) v = parseInt(String(n).split("").map((c) => SUB[c]).join(""), 10);
      else v = parseInt(n, 10);
      if (el) { o[el] = (o[el] || 0) + (v || 1); ok = true; }
      return "";
    });
    return ok ? o : null;
  }
  function whyWrong(w, q) {
    /* ★ まず「それが何なのか」を言えるなら、それをいちばん前に出す */
    const what = whatIs(w);
    const head = what ? "これは" + what + " " : "";

    /* ★ 化学式どうしなら、どの原子がいくつちがうのかを言う */
    const fa = formulaCounts(q.answer), fw = formulaCounts(w);
    if (fa && fw) {
      const els = [...new Set(Object.keys(fa).concat(Object.keys(fw)))];
      const diff = els.map((e) => {
        const d = (fw[e] || 0) - (fa[e] || 0);
        return d ? e + (d > 0 ? "が+" + d : "が" + d) : "";
      }).filter(Boolean);
      /* 倍数関係（組成式と分子式の取りちがい）かどうかを見る */
      const ratios = els.map((e) => (fa[e] ? (fw[e] || 0) / fa[e] : null)).filter((x) => x != null);
      const allSame = ratios.length && ratios.every((r) => Math.abs(r - ratios[0]) < 1e-9);
      if (allSame && Math.abs(ratios[0] - 1) > 1e-9) {
        return head + "正解の各原子を<b>ちょうど" + (Math.round(ratios[0] * 100) / 100) + "倍</b>した式です。"
          + "組成式（いちばん簡単な整数比）と分子式（実際の数）を取りちがえるとこうなります。"
          + "<b>分子量を式量で割った数</b>を掛けるところを確かめてください。";
      }
      if (diff.length) {
        return head + "正解とくらべて <b>" + diff.join("・") + "</b> だけちがいます。"
          + "原子の数え落としか、不飽和度（環と二重結合の数）の見積もりがずれています。";
      }
    }

    const A = numOf(q.answer), W = numOf(w);
    if (A != null && W != null && A !== 0 && W !== 0) {
      if (near(W, -A)) return "<b>符号が逆</b>です。向きの取りかた（正の向き・引く順番）を1か所まちがえるとこうなります。";
      if (near(W, A * 2)) return "<b>ちょうど2倍</b>です。係数の2（2倍角・往復・2電子など）を余分に掛けたか、½を掛け忘れています。";
      if (near(W, A / 2)) return "<b>ちょうど半分</b>です。係数の2を掛け忘れたか、½を余分に掛けています。";
      if (near(W, 1 / A)) return "<b>逆数</b>になっています。分母と分子を取りちがえたときの値です。";
      if (near(W, A * A)) return "<b>2乗</b>したままです。√を外す手を1回とばしています。";
      if (near(W * W, A)) return "<b>√を余分に</b>取っています。2乗すべきところを平方根にしたときの値です。";
      if (near(W, A * 3) || near(W, A / 3)) return "係数の<b>3</b>（3倍角・3電子・3価など）をひとつ多く／少なく数えたときの値です。";
      if (near(W, A + 1) || near(W, A - 1)) return "<b>1だけ</b>ずれています。個数の数えかた（両端を含むか）や、n と n−1 の取りちがいです。";
      return "計算の途中で<b>1か所だけ</b>ちがう値です。どの行で分かれるのか、上の手順を1行ずつ照らし合わせてみてください。";
    }
    /* 数でないとき（物質名・式・範囲）。
       ★ まず「それが何か」を言い、そのうえで正解との差を言う。 */
    const a = String(q.answer), s = String(w);
    if (what) {
      return head + "——この問題で聞かれているものとは<b>別のもの</b>です。"
        + "問題文のどの言葉がこの選択肢を指すのかを見ると、区別が付きます。";
    }
    if (a.length && s.length) {
      const common = [...new Set(s.split(""))].filter((c) => a.indexOf(c) >= 0).length;
      if (common / Math.max(1, s.length) > 0.6)
        return "正解と<b>とてもよく似た形</b>です。ちがうのは1か所だけなので、そこがこの問題の分かれ目になっています。";
    }
    return "この選択肢を選んでしまうのは、上の手順の<b>どこか1つ</b>を別の規則に置きかえたときです。手順を1行ずつ確かめてみてください。";
  }

  /* ══════════════════════════════════════════════════════════
     手書きの上書き（特に手厚くしたい問題）
     ══════════════════════════════════════════════════════════
     キーは "セットid#問題番号(0はじまり)"。書いた項目だけが差しかわる。 */
  const NOTES = {
    "math_t_trig2#0": {
      ask: "0≦x<2π の範囲で、sin x + √3 cos x = 1 を満たす x を<b>すべて</b>求める問題です。「すべて」なので、1つ見つけて終わりにはできません。",
      plan: "sin と cos が混ざったままでは解けません。<b>合成して sin ひとつ</b>にすると、ただの sin の方程式になります。角がずれるので、<b>ずらした角の範囲</b>で解いてから元へ戻すのが要点です。",
      steps: [
        { t: "合成する", d: "√(1²+(√3)²)=2 なので 2sin(x+α)。cosα=1/2, sinα=√3/2 より α=π/3。よって左辺は <b>2sin(x+π/3)</b>。" },
        { t: "sin の方程式にする", d: "2sin(x+π/3)=1 → <b>sin(x+π/3)=1/2</b>。" },
        { t: "★ ずらした角の範囲を出す", d: "0≦x<2π なので、x+π/3 は <b>π/3 ≦ x+π/3 < 2π+π/3</b>。ここを飛ばすと解が1つ落ちます。" },
        { t: "その範囲で解く", d: "sinθ=1/2 となるのは θ=π/6, 5π/6（＋2π）。上の範囲に入るのは <b>5π/6</b> と <b>π/6+2π=13π/6</b>。" },
        { t: "x に戻す", d: "x=5π/6−π/3=<b>π/2</b>、x=13π/6−π/3=<b>11π/6</b>。" },
      ],
      check: "x=π/2 を代入：sin(π/2)+√3cos(π/2)=1+0=1 ✓。x=11π/6：−1/2+√3·(√3/2)=−1/2+3/2=1 ✓。",
      figs: ["trig", "unitcircle"],
      traps: ["合成したあと、角の範囲をずらし忘れて解が1つ足りなくなる", "α を求めるとき cos と sin を取りちがえる"],
    },
    "cgamma_o_structure#0": {
      ask: "燃焼させて出た CO₂ と H₂O の質量から、もとの化合物の<b>組成式</b>（原子の数のいちばん簡単な比）を求める問題です。",
      plan: "C は CO₂ から、H は H₂O から出します。<b>O だけは直接測れない</b>ので、試料の質量から C と H を引いた残りとして出します。最後に mol 比を整数比に直します。",
      steps: [
        { t: "CO₂ から C の質量", d: "CO₂（44）の中で C は 12。13.2×<b>12/44</b>=3.6 mg。" },
        { t: "H₂O から H の質量", d: "H₂O（18）の中で H は 2。5.4×<b>2/18</b>=0.6 mg。" },
        { t: "★ O は引き算で", d: "9.0 − 3.6 − 0.6 = <b>4.8 mg</b>。O を直接測ろうとしないこと。" },
        { t: "mol に直す", d: "C: 3.6/12=0.30 ／ H: 0.6/1=0.60 ／ O: 4.8/16=0.30。" },
        { t: "いちばん簡単な整数比へ", d: "0.30 : 0.60 : 0.30 = <b>1 : 2 : 1</b> → 組成式 <b>CH₂O</b>。" },
      ],
      check: "CH₂O の式量は 30。C の割合は 12/30=40% で、3.6/9.0=40% と一致します。",
      figs: ["elem", "moleflow"],
      traps: ["O を測れると思って別に計算する", "質量のまま比を取る（必ず mol に直してから）"],
    },
    "phys_adv_m_shm#0": {
      ask: "振幅 A・角振動数 ω の単振動で、速さが<b>最大の半分</b>になるときの、振動中心からの<b>変位 x</b> を求める問題です。",
      plan: "単振動では「速さ」と「位置」が v²=ω²(A²−x²) で結ばれています。速さの条件を入れて x について解くだけです。エネルギー保存（½mv²+½kx²=½kA²）から出しても同じ式になります。",
      steps: [
        { t: "速さと位置の関係", d: "v = ω√(A²−x²)。中心（x=0）で最大になり、<b>v_max = ωA</b>。" },
        { t: "条件を式に", d: "v = v_max/2 なので ω√(A²−x²) = ωA/2。" },
        { t: "両辺を2乗する", d: "A²−x² = A²/4。" },
        { t: "x について解く", d: "x² = A² − A²/4 = <b>(3/4)A²</b> → x = <b>(√3/2)A</b>。" },
        { t: "意味を確かめる", d: "速さが半分になるのは、中心ではなく<b>端に近い</b>ところ。(√3/2)≒0.87 なので、ほぼ端です。逆に x=A/2 のときの速さは (√3/2)v_max。" },
      ],
      check: "x=0 を入れると v=ωA（最大）、x=A を入れると v=0（端で止まる）。どちらも正しい。",
      figs: ["spring"],
      traps: ["「速さが半分＝位置も半分」と思って A/2 を選ぶ", "2乗するのを忘れて (√3/4)A のような値になる"],
    },
  };
  function note(sid, qi) { return NOTES[sid + "#" + qi] || null; }
  /* 外から「この問題に解説があるか」を聞ける口（MagiLex とそろえるため） */
  function has(sid) {
    const sec = secOf(sid);
    return !!(subOf(sid) && isDeep(sid, sec && sec.name));
  }

  function norm(s) {
    return String(s == null ? "" : s)
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).toLowerCase();
  }

  /* ══════════════════════════════════════════════════════════
     組み立て
     ══════════════════════════════════════════════════════════ */
  function build(sid, qi) {
    const q = get(sid, qi);
    if (!q) return null;
    const nt = note(sid, qi) || {};
    const ms = methodsFor(q);
    const forms = formsFor(q, ms);
    const T = window.XVTerms;
    const F = window.XVFigs;

    /* 手順：手書きがあればそちら、無ければ extra を割ったもの */
    const steps = nt.steps
      ? nt.steps.map((s) => ({ t: s.t, text: s.d, terms: T ? T.find(s.t + " " + s.d, 2) : [], forms: [] }))
      : splitSteps(q.extra).map((line, i) => {
          const d = stepDetail(line, q);
          return { t: "手順 " + (i + 1), text: d.text, terms: d.terms, forms: d.forms };
        });

    /* ★ 2026-08-19 図は<b>その問題の数値で</b>描く（XVFigs.forProblem が数を拾う）。
       手書きの NOTES で図を指定しているときも、数は同じように渡す。 */
    const figP = F && F.parseParams ? F.parseParams([q.secNm, q.stem, q.reading, q.extra, q.answer].join(" ")) : {};
    const figs = (nt.figs && nt.figs.length
      ? nt.figs.map((id) => Object.assign({}, F ? F.info(id) : null, { p: figP }))
      : (F && F.forProblem ? F.forProblem(q, 2) : [])).filter((x) => x && x.id);

    const a = askOf(q);
    const terms = T ? T.find([q.stem, q.reading, q.extra].join(" "), 4) : [];

    /* 類題（同じセットの前後） */
    const sec = secOf(sid);
    const sib = [];
    if (sec) {
      const n = (sec.questions || []).length;
      for (let k = 1; k <= 3 && sib.length < 3; k++) {
        [qi + k, qi - k].forEach((j) => {
          if (sib.length >= 3) return;
          if (j >= 0 && j < n && j !== qi) sib.push({ sid, qi: j, stem: sec.questions[j].stem });
        });
      }
    }

    return {
      q,
      ask: nt.ask || null,
      want: a.want, given: a.given,
      plan: nt.plan || null,
      reading: q.reading,
      methods: ms, forms,
      steps,
      figs,
      check: nt.check || null,
      checks: checksOf(q),
      wrongs: q.wrong.map((w) => ({ w, why: whyWrong(w, q) })),
      traps: nt.traps || [],
      terms,
      sib,
      hand: !!note(sid, qi),
    };
  }

  /* 進捗（MagiLex の magilex_v2）。習得したかどうかを一覧に出すのに使う。 */
  function progress() {
    try { return JSON.parse(localStorage.getItem("magilex_v2") || "null") || null; } catch (e) { return null; }
  }
  function stateOf(sid, qi) {
    const P = progress(); if (!P || !P.quiz) return "new";
    const r = (P.quiz[sid] || {})[qi];
    return r && r.m ? "done" : r ? "learning" : "new";
  }

  window.XVDeep = {
    load, ready: () => loaded, sets, get, build, note, stateOf, secOf,
    has, isDeep, DEEP_LV,
    SUB_NM, DIFF_NM,
    count: () => {
      let n = 0; sets().forEach((s) => { n += s.n; });
      return { sets: sets().length, questions: n, hand: Object.keys(NOTES).length };
    },
  };
})();
