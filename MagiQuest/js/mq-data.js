/* ══════════════════════════════════════════════════════════════
   MagiQuest — 問題データ層（MagiLex の問題を「組み立て問題」に変換する）
   ──────────────────────────────────────────────────────────────
   ★★ いちばん大事な決めごと
     <b>MagiQuest 用の問題は作らない。</b>
     MagiLex がすでに持っている問題（window.LEX_SECTIONS）を<b>そのまま読み</b>、
     回答のしかただけをゲーム向けに変換する。
     ＝ MagiLex に問題が増えれば、MagiQuest にも自動で増える。

   ── MagiLex 側のかたち ──
     window.LEX_SECTIONS = [
       { id, name, icon, mode, desc,
         questions: [ { stem, reading, answer, wrong:[...], extra } ] }
     ]
     ・id の接頭辞で科目が決まる（subjectOf と同じ規則をここにも1本だけ持つ）
     ・answer は「正解の文字列」、wrong は「まちがいの選択肢」

   ── MagiQuest 側のかたち ──
     { qid, lexId, subject, genre, sectionName, stem, reading, extra,
       form,      … "formula" | "number" | "phrase" | "word"
       slots:[…], … 正しい並び（これを左から順に埋める）
       pool:[…],  … 盤面に出すパーツ（slots ＋ ダミー、混ぜてある）
       diff,      … "EASY"|"NORMAL"|"HARD"|"EXPERT"|"MASTER"
       time }     … 制限時間（秒）

   ── 変換の考えかた ──
     <b>1つの共通システム</b>で全部を扱う（問題ごとに別のゲームを作らない）。
       「問題文」＋「回答パーツ」＋「正しい並び」
     形（form）は<b>答えの文字列を見て</b>自動で決める:
       ・元素記号・数字・記号だけでできている → formula（化学式・反応式）
       ・数字＋単位                           → number（計算問題）
       ・長い文／読点がある                   → phrase（説明問題・文を並べる）
       ・それ以外（短い語）                   → word（用語・知識問題）
     ダミーのパーツは<b>まちがいの選択肢（wrong）を同じ規則で刻んだもの</b>を使う。
     ＝ 出題者が用意した「ありそうなまちがい」がそのまま盤面のノイズになる。

   ★ 将来ほかの教科（数学・英語・物理…）が増えても、この1本で扱える。
   ══════════════════════════════════════════════════════════════ */
/* eslint-disable */
(function (global) {
  "use strict";

  /* ══════════ 科目とジャンル（MagiLex の subjectOfSid と同じ規則） ══════════
     ★ MagiLex 側を直したらここも合わせる。判定は<b>この1か所</b>だけに置く。 */
  function subjectOfSid(id) {
    id = id || "";
    if (id.indexOf("geo_") === 0) return "地理";
    if (id.indexOf("math_") === 0) return "数学";
    if (id.indexOf("physg_") === 0) return "物理";
    if (id.indexOf("physb_") === 0) return "物理";
    if (id.indexOf("phys_") === 0) return "物理";
    if (id.indexOf("kokugo_") === 0) return "国語";
    if (id.indexOf("eigo") === 0) return "英語";
    if (id.indexOf("cbeta_") === 0) return "化学";
    if (id.indexOf("cgamma_") === 0) return "化学";
    if (id.indexOf("cdelta_") === 0) return "化学";
    if (id.indexOf("ceps_") === 0) return "化学";
    if (id.indexOf("bio_") === 0) return "生物";
    return "化学";
  }
  /* 化学の中のジャンル（クエストの並びに使う） */
  function genreOfSid(id, mode) {
    id = id || "";
    if (/^ceps_t_|^cbeta_t_/.test(id)) return "理論";
    if (/^ceps_i_|^cbeta_i_|^cgamma_i_/.test(id)) return "無機";
    if (/^ceps_o_|^cbeta_o_|^cgamma_o_/.test(id)) return "有機";
    if (/^ceps_p_|^cbeta_p_/.test(id)) return "高分子";
    if (/^cdelta_l_/.test(id)) return "脂質";
    if (/^cdelta_a_/.test(id)) return "芳香族";
    if (/^cdelta_i_/.test(id)) return "元素別";
    if (/^cgamma_s_/.test(id)) return "物質別";
    if (/^gas_/.test(id)) return "気体";
    if (/^metal/.test(id)) return "金属";
    if (mode === "def_to_term") return "用語";
    return "基礎";
  }

  /* ══════════ 文字の下ごしらえ ══════════ */
  var SUB_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
  var SUP_CHARS = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻";
  /* 元素記号（2文字を先に並べる。長いものから当てないと Cl が C+l に割れる） */
  var ELEMENTS = ("Uup Uus Uuo Uut Uuq Uub Rg Ds Mt Hs Bh Sg Db Rf Lr No Md Fm Es Cf Bk Cm Am Pu Np Pa Th Ac Ra Fr Rn At Po Bi Pb Tl Hg Au Pt Ir Os Re Ta Hf Lu Yb Tm Er Ho Dy Tb Gd Eu Sm Pm Nd Pr Ce La Ba Cs Xe Te Sb Sn In Cd Ag Pd Rh Ru Tc Mo Nb Zr Rb Sr Kr Br Se As Ge Ga Zn Cu Ni Co Fe Mn Cr Ti Sc Ca Cl Si Al Mg Na Ne Li Be He "
    + "H B C N O F P S K V Y I W U").split(/\s+/).filter(Boolean);

  /* 「化学式・反応式っぽい」か（日本語が混ざっていたら違う） */
  function looksFormula(s) {
    if (!s) return false;
    if (/[ぁ-んァ-ヶ一-龥]/.test(s)) return false;
    if (!/[A-Z]/.test(s)) return false;
    return /^[A-Za-z0-9₀-₉⁰-⁹⁺⁻()\[\]+\-=→⇄·・．. ,/]+$/.test(s);
  }
  /* 「数字＋単位」っぽいか */
  function looksNumber(s) {
    if (!s) return false;
    return /^[0-9]+(?:\.[0-9]+)?\s*(?:×\s*10[⁰-⁹⁻]+\s*)?[^\s]{0,8}$/.test(s.trim())
      && /[0-9]/.test(s);
  }

  /* ══════════ 刻みかた（form ごと） ══════════ */

  /* ── 化学式／反応式を「元素記号・数字・記号」に刻む ── */
  function cutFormula(s) {
    var out = [], i = 0;
    s = String(s).replace(/\s+/g, " ").trim();
    while (i < s.length) {
      var c = s[i];
      if (c === " ") { i++; continue; }
      /* 下付き（連続する ₀-₉ をひとかたまり） */
      if (SUB_DIGITS.indexOf(c) >= 0) {
        var j = i; while (j < s.length && SUB_DIGITS.indexOf(s[j]) >= 0) j++;
        out.push(s.slice(i, j)); i = j; continue;
      }
      /* 上付き（電荷） */
      if (SUP_CHARS.indexOf(c) >= 0) {
        var k = i; while (k < s.length && SUP_CHARS.indexOf(s[k]) >= 0) k++;
        out.push(s.slice(i, k)); i = k; continue;
      }
      /* 係数（ふつうの数字） */
      if (/[0-9]/.test(c)) {
        var m = i; while (m < s.length && /[0-9.]/.test(s[m])) m++;
        out.push(s.slice(i, m)); i = m; continue;
      }
      /* 元素記号（長いものから） */
      if (/[A-Za-z]/.test(c)) {
        var hit = null;
        for (var e = 0; e < ELEMENTS.length; e++) {
          var el = ELEMENTS[e];
          if (s.substr(i, el.length) === el) { hit = el; break; }
        }
        if (hit) { out.push(hit); i += hit.length; continue; }
        out.push(c); i++; continue;
      }
      /* 記号（＋ → = ( ) など） */
      out.push(c); i++;
    }
    return out;
  }

  /* ── 「数字＋単位」を刻む ── */
  function cutNumber(s) {
    var t = String(s).trim();
    var m = t.match(/^([0-9]+(?:\.[0-9]+)?)\s*(.*)$/);
    if (!m) return [t];
    var out = [];
    /* 整数部と小数部を分ける（「1」「.」「5」ではなく「1.5」のまま置く方が読みやすい） */
    out.push(m[1]);
    if (m[2]) out.push(m[2]);
    return out;
  }

  /* ── 説明文を「意味のかたまり」に刻む ──
     ★ 助詞・読点のうしろで切る。1〜2文字の細切れにしない（読めなくなる）。 */
  function cutPhrase(s) {
    var t = String(s).replace(/\s+/g, "").trim();
    var parts = t.split(/(?<=[、。])/);                 /* まず読点で */
    var out = [];
    parts.forEach(function (p) {
      if (!p) return;
      if (p.length <= 10) { out.push(p); return; }
      /* 長いかたまりは助詞のうしろでもう一段切る */
      var seg = p.split(/(?<=[はがをにでともやかのへ])/);
      var buf = "";
      seg.forEach(function (x) {
        if ((buf + x).length > 10 && buf) { out.push(buf); buf = x; }
        else buf += x;
      });
      if (buf) out.push(buf);
    });
    return out.filter(Boolean);
  }

  /* ★★ 別名のかっこを外す。
     ── 外してよいのは<b>全角（）だけ</b> ──
     MagiLex は「ギ酸（formic acid / メタン酸）」のように<b>全角</b>で別名を書く。
     いっぽう <b>半角 ( )</b> は化学式・数式の一部（(NH₃)₂ ／ (m₁+m₂) など）。
     半角まで外すと <b>答えそのものが壊れる</b>——
     実際に「x_G = (m₁x₁+…) / (m₁+…)」が「x_G =  / 」になっていた。 */
  function stripAlias(t) { return String(t).replace(/（[^）]*）/g, "").trim(); }
  /* ── 数式っぽい答えを「記号で区切って」刻む ──
     ＝ や ＋ を札にすると、並べる手ごたえがそのまま数式になる。 */
  function cutExpr(s) {
    var t = String(s).trim();
    var out = t.split(/(\s+|[=+\-×÷/()])/).map(function (x) { return x; })
      .filter(function (x) { return x !== "" && !/^\s+$/.test(x); });
    return out;
  }
  function looksExpr(s) {
    if (!s) return false;
    if (/[ぁ-んァ-ヶ一-龥]/.test(s)) return false;
    if (String(s).length < 8) return false;
    return /[=＝]|[+＋].*[+＋]|\//.test(s);
  }
  /* ── 用語を刻む ──
     ★ 短い語はそのまま1枚。長い語は2〜3枚に割って「並べて作る」手ごたえを出す。 */
  function cutWord(s) {
    var t = stripAlias(s);
    if (t.length <= 3) return [t];
    if (t.length <= 6) {
      var h = Math.ceil(t.length / 2);
      return [t.slice(0, h), t.slice(h)];
    }
    var n = t.length <= 9 ? 3 : 4, out = [], per = Math.ceil(t.length / n), p = 0;
    while (p < t.length) { out.push(t.substr(p, per)); p += per; }
    return out;
  }

  function formOf(ans) {
    if (looksFormula(ans)) return "formula";
    if (looksNumber(ans)) return "number";
    if (looksExpr(ans)) return "expr";
    var t = stripAlias(ans);
    if (t.length >= 14 || /[、。]/.test(t)) return "phrase";
    return "word";
  }
  function cutBy(form, s) {
    if (form === "formula") return cutFormula(s);
    if (form === "number") return cutNumber(s);
    if (form === "expr") return cutExpr(s);
    if (form === "phrase") return cutPhrase(s);
    return cutWord(s);
  }
  /* 刻んだ札を並べ直したときに「これと同じ」になるはずの文字列 */
  function targetOf(form, s) {
    if (form === "phrase") return String(s).replace(/\s+/g, "").trim();
    if (form === "word") return stripAlias(s);
    if (form === "expr" || form === "formula") return String(s).replace(/\s+/g, "").trim();
    return String(s).trim();
  }
  /* ★★ ダミーの札が<b>形に合っているか</b>を見る。
     ── なぜ要るか ──
     まちがいの選択肢（wrong）は、正解と<b>形がちがう</b>ことがある。
     たとえば「デオキシリボースの分子式は」（正解 C₅H₁₀O₄）の wrong に
     日本語の語が混ざっていると、cutFormula がそれを1文字ずつに刻んで
     盤面に「ス」「ボ」「リ」「ー」といった<b>ぜったいに使わない札</b>が並ぶ。
     見た目がちぐはぐなうえ、答えを探す邪魔にしかならない。
     → 形に合わない札は<b>ダミーにしない</b>。 */
  function fitsForm(form, t) {
    if (!t || !t.length) return false;
    var jp = /[ぁ-んァ-ヶ一-龥]/.test(t);
    if (form === "formula" || form === "expr") return !jp;  /* 化学式・数式に日本語は混ぜない */
    if (form === "number") return !jp || t.length <= 4; /* 単位は日本語のことがある（個・倍） */
    if (form === "word") return jp || /^[A-Za-z]+$/.test(t);
    return true;                                        /* phrase は何でもよい */
  }

  /* ══════════ 難易度 ══════════
     ★ MagiLex 側に難易度の欄は無いので、<b>盤面の重さ</b>から機械的に決める。
       ・埋めるマスの数（slots）
       ・盤面のパーツ数（pool）
     こうしておけば、問題が増えても手で付け直さなくてよい。 */
  var DIFFS = ["EASY", "NORMAL", "HARD", "EXPERT", "MASTER"];
  function diffOf(slots, pool) {
    var w = slots * 2 + pool;
    if (w <= 7) return "EASY";
    if (w <= 11) return "NORMAL";
    if (w <= 16) return "HARD";
    if (w <= 22) return "EXPERT";
    return "MASTER";
  }
  /* 制限時間（秒）。難しいほど長い。 */
  var TIME_OF = { EASY: 20, NORMAL: 25, HARD: 32, EXPERT: 40, MASTER: 50 };
  /* 難易度ごとの攻撃倍率（むずかしい問題を通すほど強い） */
  var DIFF_MUL = { EASY: 1.0, NORMAL: 1.15, HARD: 1.35, EXPERT: 1.6, MASTER: 2.0 };

  /* ══════════ 1問ぶんの変換 ══════════ */
  function buildOne(sec, q, idx) {
    var ans = String(q.answer || "").trim();
    if (!ans) return null;
    var form = formOf(ans);
    var slots = cutBy(form, ans).filter(function (x) { return x && x.length; });
    if (!slots.length || slots.length > 10) return null;
    /* ★★ <b>自分で検算する</b>（いちばん大事）。
       刻んだ札を左から並べ直したものが、答えそのものに戻らなければ<b>その問題は使わない</b>。
       これが無いと「盤面を正しく埋めたのに、答えとちがう文字列ができる」問題が混ざる
       （実際に「x_G = (m₁x₁+…) / (m₁+…)」が「x_G = /」に化けていた）。 */
    if (slots.join("") !== targetOf(form, ans)) return null;

    /* ダミー ＝ まちがいの選択肢を同じ規則で刻んだもの */
    var seen = {}, pool = [];
    slots.forEach(function (t) { pool.push(t); });
    var want = form === "phrase" ? slots.length + 3
             : form === "word" ? slots.length + 3
             : Math.min(14, slots.length + 5);
    (q.wrong || []).forEach(function (w) {
      if (pool.length >= want) return;
      cutBy(form, String(w)).forEach(function (t) {
        if (pool.length >= want) return;
        if (!t || !t.length) return;
        if (!fitsForm(form, t)) return;           /* ★ 形に合わない札はダミーにしない */
        if (slots.indexOf(t) >= 0) return;        /* 正解に使う札はダミーにしない */
        if (seen[t]) return;
        seen[t] = 1; pool.push(t);
      });
    });
    /* ★ 形に合う札だけを残した結果、ダミーが少なすぎることがある。
       そのときは<b>その形でよく出る札</b>で補う（盤面が2〜3枚だと答えが丸見えになる）。 */
    var FILL = {
      formula: ["H", "O", "C", "N", "Na", "Cl", "S", "Ca", "K", "₂", "₃", "₄", "₅", "₆", "+", "→", "(", ")"],
      number: ["0.5", "1.0", "2.0", "3.0", "10", "mol", "g", "L", "mol/L", "%"],
      word: [],
      phrase: [],
    };
    var EX = FILL[form] || [];
    for (var i = 0; i < EX.length && pool.length < Math.min(want, slots.length + 4); i++) {
      if (pool.indexOf(EX[i]) < 0) pool.push(EX[i]);
    }
    /* ★ 札が1枚しかなく、ダミーも無い＝<b>押すだけで正解</b>になる問題は出さない。
       ★ 札が2枚以上あれば、ダミーが無くても<b>並べる順番</b>が問題になるので出してよい。 */
    if (slots.length <= 1 && pool.length <= 1) return null;
    var diff = diffOf(slots.length, pool.length);
    return {
      qid: sec.id + "#" + idx,
      lexId: sec.id,
      subject: subjectOfSid(sec.id),
      genre: genreOfSid(sec.id, sec.mode),
      sectionName: sec.name || "",
      stem: String(q.stem || ""),
      reading: String(q.reading || ""),
      extra: String(q.extra || ""),
      answer: ans,
      form: form,
      slots: slots,
      pool: pool,
      diff: diff,
      time: TIME_OF[diff] || 30,
      mul: DIFF_MUL[diff] || 1,
    };
  }

  /* ══════════ 全問の取りこみ ══════════
     ★ 重いので<b>1回だけ</b>作って使いまわす（MQ_DATA.all()）。 */
  var _all = null;
  function all() {
    if (_all) return _all;
    var out = [];
    var secs = global.LEX_SECTIONS || [];
    secs.forEach(function (sec) {
      if (!sec || !sec.questions) return;
      sec.questions.forEach(function (q, i) {
        var b = null;
        try { b = buildOne(sec, q, i); } catch (e) { b = null; }
        if (b) out.push(b);
      });
    });
    _all = out;
    return out;
  }
  function bySubject(sub) {
    return all().filter(function (q) { return q.subject === sub; });
  }
  function subjects() {
    var set = {}, out = [];
    all().forEach(function (q) { if (!set[q.subject]) { set[q.subject] = 1; out.push(q.subject); } });
    var ORDER = ["化学", "数学", "物理", "生物", "英語", "国語", "地理"];
    out.sort(function (a, b) {
      var ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return out;
  }
  /* 科目のなかのジャンル（出題数つき） */
  function genresOf(sub) {
    var m = {};
    bySubject(sub).forEach(function (q) { m[q.genre] = (m[q.genre] || 0) + 1; });
    return Object.keys(m).map(function (g) { return { genre: g, n: m[g] }; })
      .sort(function (a, b) { return b.n - a.n; });
  }

  global.MQ_DATA = {
    all: all, bySubject: bySubject, subjects: subjects, genresOf: genresOf,
    DIFFS: DIFFS, DIFF_MUL: DIFF_MUL, TIME_OF: TIME_OF,
    /* 検算・作りなおし用に中身も出しておく */
    _buildOne: buildOne, _cut: cutBy, _formOf: formOf, _subjectOfSid: subjectOfSid,
  };
})(window);
