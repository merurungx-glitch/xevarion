/* ============================================================
   XEVYNAR — MagiLex ブリッジ（苦手問題の出題・問題の解説）
   ------------------------------------------------------------
   考え方
   ・MagiLex の問題データ（LEX_SECTIONS / WORD_SUBJECTS）は普通の
     `window.X = ...` スクリプト。必要になったときだけ動的に読み込む。
     起動時に読むと 300KB 近くを毎回パースすることになるので遅延読込にした。
   ・「苦手」は MagiLex の進捗（magilex_v2）から機械的に決まる：
       未習得（1度も正解が2連続していない）＞ 未着手 の順に優先。
       まだ何も解いていない人には、ランダムに出して足がかりを作る。
   ・★ 出題の結果を magilex_v2 に書き戻さないこと。
     MagiLex のセーブは MagiLex 専用 Firebase(app-cloud) が同期しており、
     ここから触ると「XEVYNAR で解いた記録」と「MagiLex 側の記録」で
     タイムスタンプが競合して、どちらかが巻き戻る。
     XEVYNAR は自分の weak（正答率）だけを記録し、本番の習得は MagiLex に任せる。

   window.XVLex として公開。
   ============================================================ */
(function () {
  "use strict";

  const SRC = [
    "../MagiLex/magilex-data.js",
    "../MagiLex/magilex-eigo.js",
    "../MagiLex/magilex-rika.js",
    "../MagiLex/magilex-chemb.js",
  ];

  let loading = null, loaded = false;

  function inject(src) {
    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);      // 1本落ちても残りで動かす
      document.head.appendChild(s);
    });
  }

  /* データを読み込む。2回目以降は即返る。 */
  function load() {
    if (loaded) return Promise.resolve(true);
    if (loading) return loading;
    loading = (async () => {
      /* 依存があるので順番に読む（eigo/rika/chemb は data の配列に足しに行く） */
      for (const s of SRC) await inject(s);
      loaded = !!(window.LEX_SECTIONS && window.LEX_SECTIONS.length);
      return loaded;
    })();
    return loading;
  }
  function ready() { return loaded && !!(window.LEX_SECTIONS && window.LEX_SECTIONS.length); }

  function sections() { return window.LEX_SECTIONS || []; }
  function subjects() { return window.WORD_SUBJECTS || {}; }

  function progress() {
    try { return JSON.parse(localStorage.getItem("magilex_v2") || "null") || null; }
    catch (e) { return null; }
  }

  /* ════════════ 苦手の抽出 ════════════ */
  /* 返り値は「出題できる形」に揃えた項目。
     kind:"quiz"  → { kind, sid, secName, qi, stem, reading, answer, wrong[], extra, state }
     kind:"word"  → { kind, key, subjName, word, meaning, frontLabel, state }
     state: "learning"（着手したが未習得＝いちばん優先）/ "new"（未着手）/ "done"（習得済み） */
  function items(opt) {
    opt = opt || {};
    const P = progress() || { quiz: {}, words: {} };
    const only = opt.subject ? String(opt.subject) : "";
    const out = [];

    sections().forEach((sec) => {
      if (only && !matchName(sec.name, only) && !matchName(sec.id, only)) return;
      const m = (P.quiz || {})[sec.id] || {};
      (sec.questions || []).forEach((q, i) => {
        const r = m[i];
        const state = r && r.m ? "done" : r ? "learning" : "new";
        out.push({
          kind: "quiz", sid: sec.id, secName: sec.name, icon: sec.icon || "📘", qi: i,
          stem: q.stem, reading: q.reading || "", answer: q.answer,
          wrong: q.wrong || [], extra: q.extra || "", state,
        });
      });
    });

    const S = subjects();
    Object.keys(S).forEach((key) => {
      const subj = S[key];
      if (only && !matchName(subj.label || key, only) && !matchName(key, only)) return;
      const m = (P.words || {})[key] || {};
      Object.keys(subj.data || {}).forEach((w) => {
        const r = m[w];
        const state = r && r.m ? "done" : r ? "learning" : "new";
        out.push({
          kind: "word", key, subjName: subj.label || key, icon: subj.icon || "📗",
          frontLabel: subj.frontLabel || "語", word: w, meaning: subj.data[w], state,
        });
      });
    });
    return out;
  }
  function matchName(a, b) {
    const K = window.XEVYNAR_KB;
    const ka = K ? K.kana(a) : String(a).toLowerCase();
    const kb = K ? K.kana(b) : String(b).toLowerCase();
    return ka.indexOf(kb) >= 0 || kb.indexOf(ka) >= 0;
  }

  /* 科目・コンテンツの一覧（「何が出せる？」に答えるため） */
  function catalog() {
    const P = progress() || { quiz: {}, words: {} };
    const rows = [];
    sections().forEach((sec) => {
      const m = (P.quiz || {})[sec.id] || {};
      const total = (sec.questions || []).length;
      let done = 0, learn = 0;
      for (let i = 0; i < total; i++) { const r = m[i]; if (r && r.m) done++; else if (r) learn++; }
      rows.push({ kind: "quiz", id: sec.id, nm: sec.name, icon: sec.icon || "📘", total, done, learn });
    });
    const S = subjects();
    Object.keys(S).forEach((key) => {
      const subj = S[key], m = (P.words || {})[key] || {};
      const words = Object.keys(subj.data || {});
      let done = 0, learn = 0;
      words.forEach((w) => { const r = m[w]; if (r && r.m) done++; else if (r) learn++; });
      rows.push({ kind: "word", id: key, nm: subj.label || key, icon: subj.icon || "📗", total: words.length, done, learn });
    });
    return rows;
  }

  /* ════════════ 出題 ════════════ */
  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = x[i]; x[i] = x[j]; x[j] = t; }
    return x;
  }

  /* 苦手からn問。着手済み未習得 → 未着手 → 習得済み の順に取る。 */
  function makeQuiz(n, opt) {
    n = Math.max(1, Math.min(20, n || 5));
    const all = items(opt);
    if (!all.length) return [];
    const rank = { learning: 0, new: 1, done: 2 };
    const pool = shuffle(all).sort((a, b) => rank[a.state] - rank[b.state]);
    const picked = [];
    const usedSec = {};
    /* 同じコンテンツばかりにならないよう、1コンテンツ最大2問までで広く取る */
    for (const it of pool) {
      const k = it.kind === "quiz" ? it.sid : it.key;
      if ((usedSec[k] || 0) >= 2 && picked.length < n) continue;
      usedSec[k] = (usedSec[k] || 0) + 1;
      picked.push(toQuestion(it, all));
      if (picked.length >= n) break;
    }
    /* 上の制限で埋まらなければ、制限なしで足す */
    if (picked.length < n) {
      for (const it of pool) {
        if (picked.length >= n) break;
        if (picked.some((p) => p.src === it)) continue;
        picked.push(toQuestion(it, all));
      }
    }
    return picked;
  }

  /* 出題1問ぶん（4択）に整える */
  function toQuestion(it, all) {
    if (it.kind === "quiz") {
      const wrong = shuffle(it.wrong || []).slice(0, 3);
      const choices = shuffle([it.answer].concat(wrong));
      return {
        src: it, kind: "quiz", topic: it.secName,
        q: it.stem + (it.reading ? " " + it.reading : ""),
        ask: "これは何？",
        answer: it.answer, choices,
        extra: it.extra || "",
      };
    }
    /* 単語は、同じ科目の別の語の意味をダミーにする */
    const others = (all || []).filter((x) => x.kind === "word" && x.key === it.key && x.word !== it.word);
    const wrong = shuffle(others).slice(0, 3).map((x) => x.meaning);
    const choices = shuffle([it.meaning].concat(wrong));
    return {
      src: it, kind: "word", topic: it.subjName,
      q: it.word, ask: "意味は？",
      answer: it.meaning, choices,
      extra: "",
    };
  }

  /* ════════════ 解説（聞かれた問題を探して答える） ════════════ */
  /* 完全一致 → 前方一致 → 部分一致 の順に、いちばん確からしいものを返す。
     見つからなければ null（＝知ったかぶりで作らない）。 */
  function explain(text) {
    const K = window.XEVYNAR_KB;
    const q = K ? K.kana(text) : String(text || "").toLowerCase();
    if (q.length < 1) return null;
    const strip = (s) => (K ? K.kana(s) : String(s || "").toLowerCase());
    let best = null, bestScore = 0;

    const score = (target) => {
      const t = strip(target);
      if (!t) return 0;
      if (t === q) return 1000;
      if (q.indexOf(t) >= 0) return 500 + t.length;      // 質問文の中に含まれている
      if (t.indexOf(q) >= 0 && q.length >= 2) return 200 + q.length;
      return 0;
    };

    sections().forEach((sec) => {
      (sec.questions || []).forEach((qq, i) => {
        const s = Math.max(score(qq.stem), score(qq.answer));
        if (s > bestScore) {
          bestScore = s;
          best = {
            kind: "quiz", secName: sec.name, icon: sec.icon || "📘", sid: sec.id, qi: i,
            stem: qq.stem, reading: qq.reading || "", answer: qq.answer, extra: qq.extra || "",
          };
        }
      });
    });
    const S = subjects();
    Object.keys(S).forEach((key) => {
      const subj = S[key];
      Object.keys(subj.data || {}).forEach((w) => {
        const s = Math.max(score(w), score(subj.data[w]) - 50);   // 語そのものの一致を優先
        if (s > bestScore) {
          bestScore = s;
          best = {
            kind: "word", subjName: subj.label || key, icon: subj.icon || "📗", key,
            word: w, meaning: subj.data[w], frontLabel: subj.frontLabel || "語",
          };
        }
      });
    });
    return bestScore >= 200 ? best : null;
  }

  /* 語・用語の候補をいくつか返す（「〜みたいな単語ある？」用） */
  function search(text, n) {
    const K = window.XEVYNAR_KB;
    const q = K ? K.kana(text) : String(text || "").toLowerCase();
    if (q.length < 2) return [];
    const out = [];
    const S = subjects();
    Object.keys(S).forEach((key) => {
      const subj = S[key];
      Object.keys(subj.data || {}).forEach((w) => {
        if (out.length >= (n || 6)) return;
        const t = K ? K.kana(w) : w.toLowerCase();
        const mm = K ? K.kana(subj.data[w]) : String(subj.data[w]).toLowerCase();
        if (t.indexOf(q) >= 0 || mm.indexOf(q) >= 0) {
          out.push({ kind: "word", subjName: subj.label || key, word: w, meaning: subj.data[w] });
        }
      });
    });
    return out;
  }

  window.XVLex = { load, ready, items, catalog, makeQuiz, explain, search, progress, sections, subjects };
})();
