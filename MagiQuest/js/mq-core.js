/* ══════════════════════════════════════════════════════════════
   MagiQuest — ゲームの中身（キャラ・編成・クエスト・バトルの計算）
   ──────────────────────────────────────────────────────────────
   ★★ キャラクターは<b>作らない</b>。XEVARION 共通のガチャキャラ（mb-core.js の CHARS）を
     そのまま使い、能力は<b>式で作る</b>（Magi: Boccia Rush と同じ考えかた）。
     ＝ ガチャにキャラが増えれば、MagiQuest にも自動で増える。手で足す表は作らない。

   ★★ 能力は<b>教科に依存しない</b>ものだけにする（ご指定）。
     攻撃力／HP／防御力／速度／回復／クリティカル／コンボ補助／回答補助／時間補助／盤面操作。
     「化学のときだけ強い」といった能力は作らない——数学や英語が増えてもそのまま使えるように。

   ── 保存 ──
     localStorage の <b>magiquest_v1</b>。中身は
       { party:[id×5], cleared:{questId:★}, best:{questId:score}, stam, ver }
     ★ 所持キャラは MagiBurst の magiburst_v1（DB.owned）をそのまま見る＝二重管理しない。
   ══════════════════════════════════════════════════════════════ */
/* eslint-disable */
(function (global) {
  "use strict";

  var SAVE_KEY = "magiquest_v1";
  var PARTY_N = 5;                     /* 基本編成は5体（ご指定） */

  /* ══════════ セーブ ══════════ */
  var S = { ver: 1, party: [], cleared: {}, best: {}, seen: {} };
  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o === "object") {
          S.party = Array.isArray(o.party) ? o.party.slice(0, PARTY_N) : [];
          S.cleared = o.cleared || {};
          S.best = o.best || {};
          S.seen = o.seen || {};
        }
      }
    } catch (e) {}
    return S;
  }
  function save() {
    /* ★ 書くのは localStorage だけでよい。
       ポータルの同期（xeva-sync.js）は PORTAL_SYNC_KEYS に載っているキーを
       まとめて見に行くので、こちらから知らせる必要はない。 */
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
  }

  /* ══════════ 所持キャラ ══════════
     MagiBurst のセーブ（magiburst_v1）の owned をそのまま読む。 */
  function ownedIds() {
    var out = [];
    try {
      var raw = localStorage.getItem("magiburst_v1");
      var db = raw ? JSON.parse(raw) : null;
      var own = (db && db.owned) || null;
      if (own) {
        Object.keys(own).forEach(function (id) {
          if (own[id] && global.CHARS && CHARS[id]) out.push(id);
        });
      }
    } catch (e) {}
    if (!out.length && global.CHAR_IDS) {
      /* まだ1体も持っていない人にも遊べるように、はじめの何体かは貸し出す */
      out = CHAR_IDS.slice(0, 8);
    }
    return out;
  }

  /* ══════════ 能力（CHARS から<b>式で</b>作る） ══════════
     ★ もとになるのは MagiBurst の最大ステータス（hp[1] / atk[1] / spd[1]）。
       MagiQuest は「答えを組み立てて殴る」ゲームなので、
       ・攻撃力  … atk をそのまま（けたvery大きいので 1/10）
       ・HP      … hp をそのまま
       ・防御力  … hp と spd の中間（打たれ強さ）
       ・速度    … spd（回答の制限時間に効く）
     ★ さらに<b>教科に依存しない4つの補助</b>を、キャラの性質から決める:
       回復・クリティカル・コンボ補助・回答補助・時間補助・盤面操作。
       どれも「MagiBurst でその子が得意なこと」を読みかえているだけなので、
       新しいキャラが増えても自動で決まる。 */
  function hasAb(c, t) {
    return !!(c && c.abil && c.abil.some(function (a) { return a.t === t || String(a.t).indexOf(t) === 0; }));
  }
  function statsOf(id) {
    var c = global.CHARS && CHARS[id];
    if (!c) return null;
    var hp = (c.hp && c.hp[1]) || 5000;
    var atk = (c.atk && c.atk[1]) || 8000;
    var spd = (c.spd && c.spd[1]) || 400;
    var star = c.star5 ? 1.0 : 0.72;                    /* SR はひかえめ */
    var st = {
      id: id, nm: c.nm, img: c.th || c.img, el: c.el,
      hp: Math.round(hp * star),
      atk: Math.round(atk * 0.1 * star),
      def: Math.round((hp * 0.06 + spd * 0.9) * star),
      spd: Math.round(spd * star),
      /* ── 教科に依存しない補助（0〜3 の段階）── */
      heal: 0, crit: 0, combo: 0, help: 0, time: 0, board: 0,
    };
    /* 回復 … リジェネ／ドレイン／回復M を持つ子 */
    if (hasAb(c, "regen")) st.heal += 2;
    if (hasAb(c, "drain")) st.heal += 1;
    if (hasAb(c, "heal")) st.heal += 2;
    /* クリティカル … キラー系をたくさん持つ子 */
    (c.abil || []).forEach(function (a) {
      if (/killer|滅殺/.test(a.t)) st.crit += 1;
      if (/aura|sokojikara/.test(a.t)) st.crit += 1;
    });
    /* コンボ補助 … FBターンを縮める系（テンポの子） */
    if (hasAb(c, "sscharge") || hasAb(c, "fbturnboost") || hasAb(c, "fbaccel")
      || hasAb(c, "fbshort") || hasAb(c, "fbtouch") || hasAb(c, "ssboost")) st.combo += 2;
    /* 回答補助（パーツを1枚教えてくれる）… リンクブースト／ウォールブースト */
    if (hasAb(c, "fsboost")) st.help += 2;
    if (hasAb(c, "wallboost")) st.help += 1;
    /* 時間補助 … ダッシュ／スピードモード（速い子は考える時間が増える） */
    if (hasAb(c, "dash")) st.time += 2;
    if (hasAb(c, "speedmode")) st.time += 1;
    /* 盤面操作（ダミーを1枚消す）… バリア／プロテクション／耐性（守りの子） */
    if (hasAb(c, "barrier")) st.board += 2;
    if (hasAb(c, "protection") || hasAb(c, "allres")) st.board += 1;
    ["heal", "crit", "combo", "help", "time", "board"].forEach(function (k) {
      st[k] = Math.max(0, Math.min(3, st[k]));
    });
    return st;
  }

  /* ══════════ 汎用スキル（どの教科でも使える・ご指定） ══════════ */
  var SKILLS = {
    timeplus: { nm: "タイムエクステンド", ic: "⏱", desc: "制限時間を8秒のばす" },
    hint:     { nm: "パーツヒント", ic: "💡", desc: "次に置くパーツを1枚光らせる" },
    shuffle:  { nm: "ボードシャッフル", ic: "🔀", desc: "盤面のパーツを並べ直す" },
    keep:     { nm: "コンボキープ", ic: "🔗", desc: "1回だけコンボが途切れない" },
    power:    { nm: "パワーチャージ", ic: "⚡", desc: "次の攻撃の威力が1.6倍" },
    guard:    { nm: "ミスガード", ic: "🛡", desc: "1回だけ不正解のダメージを受けない" },
    clean:    { nm: "ボードクリーン", ic: "🧹", desc: "ダミーのパーツを2枚消す" },
  };
  /* そのキャラが持つスキル（能力の高いところから2つ） */
  function skillsOf(id) {
    var st = statsOf(id); if (!st) return [];
    var cand = [
      ["time", "timeplus"], ["help", "hint"], ["board", "clean"],
      ["combo", "keep"], ["crit", "power"], ["heal", "guard"],
    ];
    var sorted = cand.slice().sort(function (a, b) { return st[b[0]] - st[a[0]]; });
    var out = [sorted[0][1]];
    if (sorted[1] && st[sorted[1][0]] > 0) out.push(sorted[1][1]);
    else out.push("shuffle");
    return out;
  }

  /* ══════════ 編成 ══════════ */
  function party() {
    var own = ownedIds();
    var p = (S.party || []).filter(function (id) { return own.indexOf(id) >= 0; });
    /* 足りないぶんは「いちばん強い子」で自動的に埋める */
    if (p.length < PARTY_N) {
      var rest = own.filter(function (id) { return p.indexOf(id) < 0; });
      rest.sort(function (a, b) {
        var A = statsOf(a), Bb = statsOf(b);
        return (Bb ? Bb.atk + Bb.hp * 0.1 : 0) - (A ? A.atk + A.hp * 0.1 : 0);
      });
      while (p.length < PARTY_N && rest.length) p.push(rest.shift());
    }
    return p.slice(0, PARTY_N);
  }
  function setParty(list) { S.party = (list || []).slice(0, PARTY_N); save(); }
  function teamPower() {
    return party().reduce(function (a, id) {
      var s = statsOf(id); return a + (s ? s.atk * 3 + s.hp * 0.5 + s.def : 0);
    }, 0) | 0;
  }
  /* リーダースキル＝編成のいちばん左の子。教科に依存しない補正だけ。 */
  function leaderBonus() {
    var p = party(); if (!p.length) return { atk: 1, time: 0, hint: 0 };
    var s = statsOf(p[0]) || {};
    return {
      atk: 1 + (s.crit || 0) * 0.05,
      time: (s.time || 0) * 2,                  /* 制限時間 +2秒/段 */
      hint: (s.help || 0) >= 2 ? 1 : 0,         /* 最初の1問だけヒント */
    };
  }

  /* ══════════ クエスト ══════════
     ★ 問題は MagiLex 由来なので、クエストも<b>問題データから自動で作る</b>。
       科目 × ジャンル で1本、難易度の帯で章を分ける。手で並べる表は作らない。 */
  var CH = [
    { key: "basic", nm: "初級", diffs: ["EASY", "NORMAL"], waves: 1, n: 6, hp: 9000, stam: 4 },
    { key: "mid", nm: "中級", diffs: ["NORMAL", "HARD"], waves: 2, n: 8, hp: 18000, stam: 5 },
    { key: "high", nm: "上級", diffs: ["HARD", "EXPERT"], waves: 2, n: 10, hp: 32000, stam: 6 },
    { key: "top", nm: "最上級", diffs: ["EXPERT", "MASTER"], waves: 3, n: 12, hp: 56000, stam: 8 },
  ];
  var _quests = null;
  function quests() {
    if (_quests) return _quests;
    var out = [];
    MQ_DATA.subjects().forEach(function (sub) {
      MQ_DATA.genresOf(sub).forEach(function (g) {
        CH.forEach(function (ch, ci) {
          var pool = MQ_DATA.bySubject(sub).filter(function (q) {
            return q.genre === g.genre && ch.diffs.indexOf(q.diff) >= 0;
          });
          if (pool.length < 4) return;               /* 4問そろわない帯は作らない */
          out.push({
            id: "q_" + sub + "_" + g.genre + "_" + ch.key,
            subject: sub, genre: g.genre, chapter: ch.nm, ci: ci,
            nm: g.genre + " " + ch.nm,
            n: Math.min(ch.n, pool.length),
            waves: ch.waves, hp: ch.hp, stam: ch.stam,
            need: [0, 8000, 18000, 34000][ci],       /* 推奨総戦力 */
            pool: pool,
          });
        });
      });
    });
    _quests = out;
    return out;
  }
  function questsOf(sub) { return quests().filter(function (q) { return q.subject === sub; }); }
  function questById(id) { return quests().filter(function (q) { return q.id === id; })[0] || null; }
  function starOf(id) { return S.cleared[id] || 0; }
  function setStar(id, n) {
    if ((S.cleared[id] || 0) < n) { S.cleared[id] = n; save(); }
  }
  function bestOf(id) { return S.best[id] || 0; }
  function setBest(id, v) { if ((S.best[id] || 0) < v) { S.best[id] = v; save(); } }

  /* ══════════ 判定とダメージ ══════════
     ★ ご指定の4段階（GOOD / GREAT / EXCELLENT / PERFECT）。
       見るのは「正解したか・かかった時間・連続正解数・問題の難易度」。 */
  var GRADES = [
    { key: "GOOD", nm: "GOOD", mul: 1.00, c: "#7cc4ff" },
    { key: "GREAT", nm: "GREAT", mul: 1.45, c: "#8affc4" },
    { key: "EXCELLENT", nm: "EXCELLENT", mul: 2.10, c: "#ffd257" },
    { key: "PERFECT", nm: "PERFECT", mul: 3.00, c: "#ff6fa8" },
  ];
  /* 残り時間の割合とミスの数で段階を決める */
  function gradeOf(leftRate, miss) {
    if (miss > 0) return GRADES[0];
    if (leftRate >= 0.75) return GRADES[3];
    if (leftRate >= 0.50) return GRADES[2];
    if (leftRate >= 0.25) return GRADES[1];
    return GRADES[0];
  }
  /* コンボ倍率（ご指定 1/2/3/5/10 の節目で伸びる） */
  function comboMul(n) {
    if (n >= 30) return 2.60;
    if (n >= 20) return 2.30;
    if (n >= 10) return 2.00;
    if (n >= 5) return 1.65;
    if (n >= 3) return 1.35;
    if (n >= 2) return 1.15;
    return 1.00;
  }
  function comboLabel(n) {
    if (n >= 30) return "30 COMBO";
    if (n >= 20) return "20 COMBO";
    if (n >= 10) return "10 COMBO";
    if (n >= 5) return "5 COMBO";
    if (n >= 3) return "3 COMBO";
    if (n >= 2) return "2 COMBO";
    return "";
  }
  /* 1問ぶんの攻撃力 */
  function damageOf(opt) {
    var atk = opt.atk || 0;
    var g = opt.grade || GRADES[0];
    var d = (opt.diffMul || 1);
    var c = comboMul(opt.combo || 0);
    var lead = (opt.lead && opt.lead.atk) || 1;
    var extra = opt.power ? 1.6 : 1;
    return Math.round(atk * g.mul * d * c * lead * extra);
  }
  /* 敵の攻撃（不正解のとき）。防御力で軽くなる。 */
  function enemyHit(base, def) {
    var cut = Math.min(0.6, (def || 0) / 12000);
    return Math.max(1, Math.round(base * (1 - cut)));
  }

  /* ══════════ スタミナ・XEVA（ポータル共通のものを使う） ══════════
     ★ 実体は xeva.js の <b>XEVA.status</b>（xeva_status_v1）。
       MagiBurst と同じ入口を使う＝MagiQuest だけ別勘定にならない。 */
  function xstat() { return (global.XEVA && XEVA.status) || null; }
  function stamNow() {
    var S2 = xstat(); if (!S2) return 99;
    try { return S2.getStamina(); } catch (e) { return 99; }
  }
  function stamMax() {
    var S2 = xstat(); if (!S2) return 99;
    try { return S2.getMax(); } catch (e) { return 99; }
  }
  function useStam(n) {
    var S2 = xstat(); if (!S2) return true;         /* 単体で開いたときは止めない */
    try { return S2.spend(n, "MagiQuest"); } catch (e) { return true; }
  }
  /* クリア報酬の XEVA */
  function addXeva(n, why) {
    try { if (global.XEVA && XEVA.add) XEVA.add(n, why || "MagiQuest クエストクリア"); } catch (e) {}
  }

  load();
  global.MQ = {
    SAVE_KEY: SAVE_KEY, PARTY_N: PARTY_N, S: S, save: save, load: load,
    ownedIds: ownedIds, statsOf: statsOf, skillsOf: skillsOf, SKILLS: SKILLS,
    party: party, setParty: setParty, teamPower: teamPower, leaderBonus: leaderBonus,
    quests: quests, questsOf: questsOf, questById: questById,
    starOf: starOf, setStar: setStar, bestOf: bestOf, setBest: setBest,
    GRADES: GRADES, gradeOf: gradeOf, comboMul: comboMul, comboLabel: comboLabel,
    damageOf: damageOf, enemyHit: enemyHit, CH: CH,
    stamNow: stamNow, stamMax: stamMax, useStam: useStam, addXeva: addXeva,
  };
})(window);
