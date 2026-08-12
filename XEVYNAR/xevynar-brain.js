/* ============================================================
   XEVYNAR — ブレイン（記憶・学習・意図解釈・回答生成）
   ------------------------------------------------------------
   考え方
   ・XEVARION は静的ホスティングなので、外部AIのAPIキーを埋め込むと
     誰でも読めてしまう。そこで「本体は自前の推論エンジン」で完結させ、
     外部LLMは *使いたい人が設定画面で自分のエンドポイントを入れたときだけ*
     上乗せで使う、という二段構えにしている（設定 → AI接続）。
   ・XEVYNAR の強みは賢い文章生成ではなく **その人のデータを知っていること**。
     XEVA・MagiLex の習得状況・MagiBurst の所持キャラ・MagiFocus の学習記録・
     MagiLink の会話を読み、本人に合わせて答える。
   ・学んだこと（苦手・目標・口ぐせ・予定）は accounts/{uid}/store 経由で
     クラウドに同期されるので、端末を変えても覚えている。

   window.XV として公開。
   ============================================================ */
(function () {
  "use strict";

  const KEY = "xevynar_v1";
  const now = () => Date.now();
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ════════════ 保存領域 ════════════ */
  function fresh() {
    return {
      v: 1,
      profile: { name: "", grade: "", goal: "", examName: "", examDate: "", dailyMin: 60, subjects: [] },
      sessions: [],        // { id, at, min, subject, topic, focus }
      plan: null,          // { date, items:[{t, min, subject, done}] , why }
      memory: [],          // { k, v, at }  … 本人について学んだこと
      weak: {},            // topic -> { miss, hit, at }
      qa: [],              // { q, a, at }
      chat: [],            // { r:"me"|"ai", t, at }
      link: {},            // 相手名 -> { msgs:[{who,t,at}], tone }
      burst: { asks: [] },
      cfg: { api: { url: "", key: "", model: "" }, nickname: "" },
      updatedAt: 0,
    };
  }
  let S = fresh();
  function load() {
    try {
      const r = localStorage.getItem(KEY);
      if (r) S = Object.assign(fresh(), JSON.parse(r));
    } catch (e) { S = fresh(); }
    if (!S.profile) S.profile = fresh().profile;
    if (!S.cfg) S.cfg = fresh().cfg;
    if (!S.cfg.api) S.cfg.api = { url: "", key: "", model: "" };
    ["sessions", "memory", "qa", "chat"].forEach((k) => { if (!Array.isArray(S[k])) S[k] = []; });
    if (!S.weak) S.weak = {};
    if (!S.link) S.link = {};
    if (!S.burst) S.burst = { asks: [] };
    return S;
  }
  function save() {
    S.updatedAt = now();
    /* 記録は無限には持たない（同期する値なので大きくしすぎない） */
    if (S.chat.length > 200) S.chat = S.chat.slice(-200);
    if (S.qa.length > 120) S.qa = S.qa.slice(-120);
    if (S.sessions.length > 400) S.sessions = S.sessions.slice(-400);
    if (S.memory.length > 80) S.memory = S.memory.slice(-80);
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }
  load();

  /* ════════════ 他アプリのデータを読む ════════════ */
  function jget(k, d) { try { const r = localStorage.getItem(k); return r == null ? d : JSON.parse(r); } catch (e) { return d; } }

  const DATA = {
    account() { return jget("xeva_account_v1", null) || {}; },
    xeva() { try { return window.XEVA ? window.XEVA.getBalance() : (jget("xeva_wallet_v1", {}) || {}).balance || 0; } catch (e) { return 0; } },
    /* 💎ジェム（XEVARION 共通のプレミアム通貨） */
    gem() { try { return window.XEVA && window.XEVA.gem ? window.XEVA.gem.get() : (jget("xeva_gem_v1", {}) || {}).balance || 0; } catch (e) { return 0; } },
    /* MagiLex の学習状況 */
    lex() { return jget("magilex_v2", null); },
    /* MagiBurst のセーブ（所持キャラ・クリア状況・パーティー） */
    burst() { return jget("magiburst_v1", null); },
    /* MagiFocus / StudyGuard の学習記録 */
    focus() { return jget("magifocus_v1", null) || jget("sg_v3", null); },
    /* ミッションの達成状況（ポータル） */
    missions() { try { return window.XEVA ? window.XEVA.getMissions() : []; } catch (e) { return []; } },
  };

  /* MagiLex: 科目ごとの習得状況をまとめる（データファイルが無くても progress だけで出せる） */
  function lexSummary() {
    const P = DATA.lex();
    if (!P) return null;
    const out = { answered: 0, correct: 0, streak: P.streak || 0, contents: [], masteredContents: 0 };
    out.answered = (P.totals && P.totals.answered) || 0;
    out.correct = (P.totals && P.totals.correct) || 0;
    out.masteredContents = Object.keys(P.qmastered || {}).length + Object.keys(P.wmastered || {}).length;
    /* 未習得が多い＝苦手として扱う。quiz は index ごと、words は単語ごとに記録がある */
    const push = (nm, m) => {
      let mastered = 0, learning = 0;
      Object.keys(m || {}).forEach((k) => { const r = m[k]; if (r && r.m) mastered++; else if (r) learning++; });
      if (mastered + learning > 0) out.contents.push({ nm, mastered, learning });
    };
    Object.keys(P.quiz || {}).forEach((sid) => push(sid, P.quiz[sid]));
    Object.keys(P.words || {}).forEach((k) => push(k, P.words[k]));
    out.contents.sort((a, b) => b.learning - a.learning);
    return out;
  }

  /* MagiBurst: 所持キャラ一覧（KB と突き合わせる） */
  function burstOwned() {
    const DB = DATA.burst();
    const KB = window.XEVYNAR_KB;
    if (!DB || !KB) return [];
    return Object.keys(DB.chars || {}).map((id) => KB.CHAR_BY_ID[id]).filter(Boolean);
  }

  /* ════════════ 記憶（本人について学んだこと） ════════════ */
  function remember(k, v) {
    if (!k || !v) return;
    const i = S.memory.findIndex((m) => m.k === k);
    if (i >= 0) S.memory[i] = { k, v, at: now() };
    else S.memory.push({ k, v, at: now() });
    save();
  }
  function recall(k) { const m = S.memory.find((x) => x.k === k); return m ? m.v : null; }
  function forgetAll() { S.memory = []; save(); }

  /* 発言から自動で学ぶ。「〜が苦手」「志望校は〜」など、はっきりした言い方だけ拾う。
     推測で覚えると間違いを溜め込むので、パターンは厳しめにしている。 */
  const LEARN_RULES = [
    { re: /(?:^|[、。\s])([^\s、。]{1,12})(?:が|は)(?:とても|すごく|かなり)?苦手/, k: (m) => "苦手:" + m[1], v: (m) => m[1], msg: (m) => "「" + m[1] + "が苦手」と覚えました" },
    { re: /(?:^|[、。\s])([^\s、。]{1,12})(?:が|は)(?:とても|すごく|かなり)?得意/, k: (m) => "得意:" + m[1], v: (m) => m[1], msg: (m) => "「" + m[1] + "が得意」と覚えました" },
    { re: /志望(?:校|大学)(?:は|が)\s*([^\s、。]{2,20})/, k: () => "志望校", v: (m) => m[1], msg: (m) => "志望校を「" + m[1] + "」として覚えました" },
    { re: /(?:目標|ゴール)(?:は|が)\s*([^、。]{2,40})/, k: () => "目標", v: (m) => m[1], msg: (m) => "目標を覚えました" },
    { re: /(?:毎日|1日|一日)\s*(\d{1,3})\s*(?:分|ぷん)/, k: () => "1日の目標(分)", v: (m) => m[1], msg: (m) => "1日の目標を " + m[1] + "分 として覚えました" },
    { re: /(?:毎日|1日|一日)\s*(\d{1,2})\s*(?:時間|じかん)/, k: () => "1日の目標(分)", v: (m) => String(Number(m[1]) * 60), msg: (m) => "1日の目標を " + m[1] + "時間 として覚えました" },
  ];
  function autoLearn(text) {
    const learned = [];
    LEARN_RULES.forEach((r) => {
      const m = r.re.exec(text);
      if (!m) return;
      const k = r.k(m), v = r.v(m);
      if (recall(k) === v) return;
      remember(k, v);
      if (k === "1日の目標(分)") { S.profile.dailyMin = Number(v) || S.profile.dailyMin; }
      if (k === "志望校") S.profile.examName = v;
      learned.push(r.msg(m));
    });
    /* 試験日 */
    const d = parseDate(text);
    if (d && /(テスト|試験|入試|模試|本番|受験)/.test(text)) {
      const iso = ymd(d);
      if (S.profile.examDate !== iso) { S.profile.examDate = iso; save(); learned.push(iso.replace(/-/g, "/") + " を試験日として覚えました"); }
    }
    if (learned.length) save();
    return learned;
  }

  /* ════════════ 文字列・日時ユーティリティ ════════════ */
  const Z2H = (s) => String(s).replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  /* ★ 長音符「ー」は消さないこと。消すと「タイマー→タイマ」「サッカー→サッカ」のように
     カタカナ語が別物になり、意図の判定がまるごと外れる。記号だけを落とす。 */
  function norm(s) {
    return Z2H(String(s == null ? "" : s)).toLowerCase()
      .replace(/[!-\/:-@\[-`{-~、。！？「」『』（）・…\s]+/g, " ").trim();
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function fmtMin(min) {
    min = Math.round(min || 0);
    if (min < 60) return min + "分";
    const h = Math.floor(min / 60), m = min % 60;
    return h + "時間" + (m ? m + "分" : "");
  }
  /* 「7/20」「7月20日」「明日」「あさって」「来週の月曜」 */
  function parseDate(text) {
    const t = Z2H(String(text || ""));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (/今日|きょう/.test(t)) return today;
    if (/明日|あした|あす/.test(t)) return new Date(today.getTime() + 86400000);
    if (/明後日|あさって/.test(t)) return new Date(today.getTime() + 2 * 86400000);
    let m = /(\d{1,2})\s*[\/月]\s*(\d{1,2})/.exec(t);
    if (m) {
      const mo = Number(m[1]), da = Number(m[2]);
      if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
        let d = new Date(today.getFullYear(), mo - 1, da);
        if (d < today) d = new Date(today.getFullYear() + 1, mo - 1, da);   // 過ぎていれば来年
        return d;
      }
    }
    m = /(\d{1,3})\s*日後/.exec(t);
    if (m) return new Date(today.getTime() + Number(m[1]) * 86400000);
    return null;
  }
  /* 「25分」「1時間半」「90」 */
  function parseMinutes(text) {
    const t = Z2H(String(text || ""));
    let total = 0, hit = false;
    let m = /(\d+(?:\.\d+)?)\s*(?:時間|じかん|h)/.exec(t);
    if (m) { total += Number(m[1]) * 60; hit = true; if (/半/.test(t.slice(m.index))) total += 30; }
    m = /(\d+)\s*(?:分|ぷん|min)/.exec(t);
    if (m) { total += Number(m[1]); hit = true; }
    if (!hit) { m = /(?:^|\s)(\d{1,3})(?:$|\s)/.exec(t); if (m) { total = Number(m[1]); hit = true; } }
    return hit ? Math.round(total) : 0;
  }
  /* タイマー用。分だけでなく <b>秒・時間・「1:30」表記</b> まで読む。
     時間を自由に決められるようにするため、上限は設けない（3時間でも5秒でもよい）。 */
  function parseSeconds(text) {
    const t = Z2H(String(text || ""));
    let sec = 0, hit = false;
    let m = /(\d{1,2})\s*[:：]\s*(\d{1,2})(?:\s*[:：]\s*(\d{1,2}))?/.exec(t);
    if (m) {
      if (m[3] != null) sec = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
      else sec = Number(m[1]) * 60 + Number(m[2]);
      return Math.round(sec);
    }
    m = /(\d+(?:\.\d+)?)\s*(?:時間|じかん|h(?![a-z]))/.exec(t);
    if (m) { sec += Number(m[1]) * 3600; hit = true; if (/半/.test(t.slice(m.index))) sec += 1800; }
    m = /(\d+)\s*(?:分|ぷん|min(?:ute)?s?|m(?![a-z]))/.exec(t);
    if (m) { sec += Number(m[1]) * 60; hit = true; }
    m = /(\d+)\s*(?:秒|びょう|sec(?:ond)?s?|s(?![a-z]))/.exec(t);
    if (m) { sec += Number(m[1]); hit = true; }
    /* 単位が無い数字は「分」とみなす（「25」→25分） */
    if (!hit) { m = /(?:^|[^\d])(\d{1,4})(?:$|[^\d])/.exec(t); if (m) { sec = Number(m[1]) * 60; hit = true; } }
    return hit ? Math.round(sec) : 0;
  }
  function fmtSec(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h) return h + "時間" + (m ? m + "分" : "") + (s ? s + "秒" : "");
    if (m) return m + "分" + (s ? s + "秒" : "");
    return s + "秒";
  }

  /* ════════════ 学習記録 ════════════ */
  const SUBJECTS = ["英語", "数学", "国語", "理科", "物理", "化学", "生物", "地学", "社会", "日本史", "世界史", "地理", "古文", "漢文", "情報"];
  function pickSubject(text) {
    const t = String(text || "");
    for (const s of SUBJECTS) if (t.indexOf(s) >= 0) return s;
    if (/英単語|えいたんご|english|単語/.test(t)) return "英語";
    if (/数ⅰ|数ⅱ|数ⅲ|数a|数b|数c|計算|関数|微分|積分/i.test(t)) return "数学";
    return "";
  }
  function addSession(min, subject, topic) {
    min = Math.max(1, Math.round(min || 0));
    const rec = { id: "s" + now().toString(36), at: now(), min, subject: subject || "", topic: topic || "" };
    S.sessions.push(rec); save();
    try { window.dispatchEvent(new CustomEvent("xv:changed")); } catch (e) {}
    return rec;
  }
  function sessionsIn(days) {
    const from = now() - days * 86400000;
    return S.sessions.filter((s) => s.at >= from);
  }
  function todayMin() {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    return S.sessions.filter((s) => s.at >= t0.getTime()).reduce((a, s) => a + s.min, 0);
  }
  function weekSeries() {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const e = d.getTime() + 86400000;
      out.push({ d, min: S.sessions.filter((s) => s.at >= d.getTime() && s.at < e).reduce((a, s) => a + s.min, 0) });
    }
    return out;
  }
  function streakDays() {
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const e = d.getTime() + 86400000;
      const has = S.sessions.some((s) => s.at >= d.getTime() && s.at < e);
      if (has) n++;
      else if (i > 0) break;      // 今日まだでも連続は途切れていない扱い
    }
    return n;
  }
  /* 得意・苦手の記録（MagiLex の出題や自己申告から） */
  function markWeak(topic, ok) {
    if (!topic) return;
    const w = S.weak[topic] || { miss: 0, hit: 0, at: 0 };
    if (ok) w.hit++; else w.miss++;
    w.at = now();
    S.weak[topic] = w; save();
  }
  function weakList() {
    return Object.keys(S.weak).map((k) => {
      const w = S.weak[k], t = w.hit + w.miss;
      return { topic: k, rate: t ? w.hit / t : 0, total: t, miss: w.miss };
    }).filter((x) => x.total >= 2).sort((a, b) => a.rate - b.rate);
  }

  /* ════════════ 学習プランを組み立てる ════════════ */
  function buildPlan(totalMin) {
    const target = totalMin || Number(recall("1日の目標(分)")) || S.profile.dailyMin || 60;
    const items = [];
    const weak = weakList().slice(0, 3);
    const lex = lexSummary();
    const why = [];

    /* ① 苦手の復習を最優先（全体の4割） */
    if (weak.length) {
      const per = Math.max(10, Math.round(target * 0.4 / weak.length));
      weak.forEach((w) => {
        items.push({ t: w.topic + " の復習", min: per, subject: pickSubject(w.topic) || "復習", done: false });
      });
      why.push("正答率の低い <b>" + weak.map((w) => esc(w.topic)).join("・") + "</b> を先に入れました");
    }
    /* ② MagiLex の習得中コンテンツを進める */
    if (lex && lex.contents.length) {
      const c = lex.contents[0];
      items.push({ t: "MagiLex「" + c.nm + "」を進める", min: Math.max(15, Math.round(target * 0.25)), subject: "MagiLex", done: false });
      why.push("MagiLex で <b>習得中が" + c.learning + "件</b> 残っている「" + esc(c.nm) + "」を続けると、完全習得の XEVA に近づきます");
    }
    /* ③ 記憶している苦手科目 */
    S.memory.filter((m) => m.k.indexOf("苦手:") === 0).slice(0, 2).forEach((m) => {
      if (items.some((i) => i.t.indexOf(m.v) >= 0)) return;
      items.push({ t: m.v + " の演習", min: Math.max(15, Math.round(target * 0.2)), subject: pickSubject(m.v) || m.v, done: false });
      why.push("「" + esc(m.v) + "が苦手」と教えてもらったので入れています");
    });
    /* ④ 余りは「新しく進める」枠 */
    let used = items.reduce((a, i) => a + i.min, 0);
    if (used < target) {
      items.push({ t: "新しい範囲を進める", min: target - used, subject: "", done: false });
    } else if (used > target && items.length) {
      /* 目標を超えたら按分して縮める */
      const k = target / used;
      items.forEach((i) => { i.min = Math.max(10, Math.round(i.min * k / 5) * 5); });
    }
    /* 休憩を挟む（50分ごと） */
    S.plan = { date: ymd(new Date()), items, why, target, at: now() };
    save();
    return S.plan;
  }

  /* ════════════ MagiBurst 編成の提案 ════════════
     ★ 設計方針
       ・「所持キャラが4体そろっていないので出せません」で終わらせない。
         未所持でも <b>理想の編成</b> を出し、そのうえで「持っている中でのベスト」と
         「あと何を入手すればいいか」を並べて見せる。
       ・omni（オムニアンチ）は "2回行動するまで" の限定なので、
         専用アビリティ持ちと同列に「対策できている」と数えない。
         数えると、実際には無防備なのに「対策できています」と答えてしまう。
         → 専用アビリティで埋まった対策だけを covered とし、
           omni は "条件つきで補える" 別枠として返す。 */
  function suggestParty(stage, opt) {
    const KB = window.XEVYNAR_KB;
    if (!KB) return null;
    opt = opt || {};
    const DB = DATA.burst();
    const keys = (stage && stage.anti) || [];
    const foeEl = (stage && stage.el) || "";
    const goodEl = KB.EL_COUNTER[foeEl] || "";        // その敵に有利な味方属性
    const wKey = (k) => (KB.DMG_GIMS.indexOf(k) >= 0 ? 120 : 45);
    const lvOf = (id) => {
      const r = (DB && DB.chars && DB.chars[id]) || null;
      return r ? (r.lv || 1) + (r.awk || 0) * 3 : 0;
    };

    /* pool から貪欲に4体選ぶ。owned=true のときはレベルも加点する。 */
    function pick(pool, useLevel) {
      const need = new Set(keys);
      const picked = [];
      const rest = pool.slice();
      while (picked.length < 4 && rest.length) {
        let best = null, bv = -1;
        /* 埋まっていない対策が無くなったら、残り枠は「編成として強いか」で選ぶ。
           ここで omni を優遇し続けると、対策が済んでいるのに保険ばかり4体並ぶ。 */
        const allCovered = need.size === 0;
        const hasHeal = picked.some((p) => KB.rolesOf(KB.CHAR_BY_ID[p].abil).indexOf("heal") >= 0);
        rest.forEach((id) => {
          const c = KB.CHAR_BY_ID[id];
          /* まだ埋まっていない対策をいくつ埋められるか（専用アビリティのみ） */
          let cover = 0;
          need.forEach((k) => { if (KB.counters(id, k)) cover += wKey(k); });
          let sc = 0;
          keys.forEach((k) => { if (KB.counters(id, k)) sc += wKey(k); });
          if (keys.length && keys.every((k) => KB.counters(id, k))) sc += 500;   // 1体で全対策＝最優先
          if (!allCovered && KB.isOmni(id)) sc += 120;                           // 穴が残っている間だけ保険を評価
          if (goodEl && c && c.el === goodEl) sc += allCovered ? 200 : 90;       // 有利属性（埋まったら最重要）
          if (c && c.star5) sc += 40;
          const roles = c ? KB.rolesOf(c.abil) : [];
          if (allCovered) {
            if (!hasHeal && roles.indexOf("heal") >= 0) sc += 150;               // 回復役を1体は入れたい
            if (roles.indexOf("power") >= 0) sc += 60;
          }
          /* 撃種は反射と貫通を混ぜたい（撃種限定ブロック対策） */
          if (c && picked.length && !picked.some((p) => KB.CHAR_BY_ID[p].shot !== c.shot)) sc += 45;
          const v = cover * 1000 + sc * 10 + (useLevel ? lvOf(id) : 0);
          if (v > bv) { bv = v; best = id; }
        });
        if (best == null) break;
        picked.push(best); rest.splice(rest.indexOf(best), 1);
        keys.forEach((k) => { if (KB.counters(best, k)) need.delete(k); });
      }
      if (useLevel) rest.sort((a, b) => lvOf(b) - lvOf(a));
      while (picked.length < 4 && rest.length) picked.push(rest.shift());
      return picked;
    }

    /* 対策の状況を、omni を混ぜずに正しく数える */
    function analyze(ids) {
      const covered = [], viaOmni = [], missing = [];
      keys.forEach((k) => {
        if (ids.some((id) => KB.counters(id, k))) covered.push(k);
        else if (ids.some((id) => KB.isOmni(id))) viaOmni.push(k);
        else missing.push(k);
      });
      const chars = ids.map((id) => KB.CHAR_BY_ID[id]).filter(Boolean);
      return {
        ids, chars, covered, viaOmni, missing,
        omni: ids.filter((id) => KB.isOmni(id)).map((id) => KB.CHAR_BY_ID[id]),
        advantage: chars.filter((c) => goodEl && c.el === goodEl).length,
        shots: [...new Set(chars.map((c) => c.shot))],
        roles: KB.rolesOf(chars.reduce((a, c) => a.concat(c.abil), [])),
      };
    }

    const ownedIds = burstOwned().map((c) => c.id);
    const allIds = KB.CHARS.map((c) => c.id);

    const ideal = analyze(pick(allIds, false));
    const mine = ownedIds.length >= 4 && !opt.idealOnly ? analyze(pick(ownedIds, true)) : null;

    /* 手持ちで埋まらない対策を、どのキャラで埋められるか（入手目標） */
    const targets = {};
    (mine ? mine.missing : keys).forEach((k) => {
      targets[k] = KB.countersFor(k).slice(0, 4).map((c) => ({
        id: c.id, nm: c.nm, el: c.el, shot: c.shot, star5: c.star5,
        owned: ownedIds.indexOf(c.id) >= 0,
        where: KB.poolText(c.id),
      }));
    });

    return {
      stage, keys, foeEl, goodEl,
      ideal, mine, targets,
      ownedCount: ownedIds.length,
      ownedIds,
    };
  }

  /* ════════════ 外部AI（設定した人だけ） ════════════ */
  function apiReady() { return !!(S.cfg.api && S.cfg.api.url); }
  /* その人の状況を短くまとめて、外部AIへの前置きにする */
  function contextBrief() {
    const a = DATA.account(), lex = lexSummary(), b = DATA.burst();
    const lines = [];
    if (a.name) lines.push("ユーザー名: " + a.name);
    if (S.profile.examName) lines.push("志望: " + S.profile.examName);
    if (S.profile.examDate) lines.push("試験日: " + S.profile.examDate);
    lines.push("今日の学習: " + fmtMin(todayMin()) + "（目標 " + fmtMin(Number(recall("1日の目標(分)")) || S.profile.dailyMin) + "）");
    const w = weakList().slice(0, 4);
    if (w.length) lines.push("正答率の低い項目: " + w.map((x) => x.topic + "(" + Math.round(x.rate * 100) + "%)").join(", "));
    S.memory.slice(-8).forEach((m) => lines.push(m.k + ": " + m.v));
    if (lex) lines.push("MagiLex 完全習得コンテンツ: " + lex.masteredContents);
    if (b) lines.push("MagiBurst 所持キャラ: " + Object.keys(b.chars || {}).length + "体");
    lines.push("所持: " + DATA.xeva() + " XEVA / " + DATA.gem() + " ジェム");
    return lines.join("\n");
  }
  async function askApi(text) {
    const c = S.cfg.api;
    if (!c || !c.url) return null;
    const body = {
      messages: S.chat.slice(-8).map((m) => ({ role: m.r === "me" ? "user" : "assistant", content: m.t }))
        .concat([{ role: "user", content: text }]),
      system: "あなたは XEVARION の学習AI「XEVYNAR」です。日本語で、簡潔に、やさしく答えてください。"
        + "以下は相談者の状況です。必要なときだけ参照してください。\n" + contextBrief(),
      model: c.model || undefined,
    };
    const headers = { "Content-Type": "application/json" };
    if (c.key) headers["Authorization"] = "Bearer " + c.key;
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 30000);
    try {
      const r = await fetch(c.url, { method: "POST", headers, body: JSON.stringify(body), signal: ctl.signal });
      clearTimeout(to);
      if (!r.ok) return null;
      const j = await r.json();
      /* よくある形をひととおり受け止める */
      const t = (typeof j === "string") ? j
        : j.text || j.reply || j.output_text
        || (j.content && (Array.isArray(j.content) ? j.content.map((x) => x.text || "").join("") : j.content))
        || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content)
        || "";
      return String(t || "").trim() || null;
    } catch (e) { clearTimeout(to); return null; }
  }

  window.XV = {
    KEY, get S() { return S; }, load, save, fresh,
    esc, norm, Z2H, pad, ymd, fmtMin, fmtSec, parseDate, parseMinutes, parseSeconds, pickSubject, SUBJECTS,
    DATA, lexSummary, burstOwned,
    remember, recall, forgetAll, autoLearn,
    addSession, sessionsIn, todayMin, weekSeries, streakDays, markWeak, weakList,
    buildPlan, suggestParty,
    apiReady, askApi, contextBrief,
  };
})();
