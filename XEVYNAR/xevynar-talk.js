/* ============================================================
   XEVYNAR — 会話エンジン（意図の判定 → 回答の組み立て）
   ------------------------------------------------------------
   戻り値: { html, acts?:[[ラベル, 実行する式], ...], learned?:[...], byline?:true }

   設計方針
   ・意図の判定は「上から順に正規表現」ではなく <b>スコア式のあいまい一致</b>。
     ぴったりの言葉が無くても、いちばん近い話題を選んで必ず次の一手を出す。
     順番依存だと「MagiBurst の第12の間で勝てない」のような複合文で
     先に当たったルールに吸われてしまい、正しい答えに届かない。
   ・答えられないことは「答えられない」と言う。
     学習アプリなので、知ったかぶりの数値・解答がいちばん害になる。
   ・「提供：XEVYNAR」は毎回は出さない。
     生成した中身（プラン・編成・解説・出題）にだけ付ける。
     あいさつや操作の返事にまで付けると、ただのノイズになって読みにくい。
   ============================================================ */
(function () {
  "use strict";
  const X = window.XV;
  const esc = X.esc;
  const KB = () => window.XEVYNAR_KB;

  /* ── 小道具 ── */
  const b = (s) => "<b>" + s + "</b>";
  const note = (s) => '<div class="xv-sub">' + s + "</div>";
  function chip(label, expr) { return [label, expr]; }
  function q(s) { return String(s == null ? "" : s).replace(/['"\\<>]/g, ""); }
  const GEM = '<img class="xv-gemico" src="../gem.png" alt="ジェム">';

  function greet() {
    const h = new Date().getHours();
    if (h < 5) return "こんばんは";
    if (h < 11) return "おはようございます";
    if (h < 18) return "こんにちは";
    return "こんばんは";
  }
  function examDays() {
    const d = X.S.profile.examDate;
    if (!d) return null;
    const t = new Date(d + "T00:00:00").getTime();
    if (isNaN(t)) return null;
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((t - t0.getTime()) / 86400000));
  }

  /* ════════════════════════════════════════════
     いまの状況
     ════════════════════════════════════════════ */
  function statusAnswer() {
    const rows = [];
    const t = X.todayMin();
    const st = X.streakDays();
    const lex = X.lexSummary();
    rows.push("XEVA：" + b(X.DATA.xeva().toLocaleString()) + "　" + GEM + "ジェム：" + b(X.DATA.gem().toLocaleString()));
    if (t) rows.push("今日の学習：" + b(X.fmtMin(t)) + (st > 1 ? "（連続 " + st + "日）" : ""));
    if (lex) rows.push("MagiLex：完全習得 " + b(lex.masteredContents + "コンテンツ") +
      (lex.answered ? "／正答率 " + Math.round(lex.correct / lex.answered * 100) + "%" : ""));
    const owned = X.burstOwned();
    if (owned.length) rows.push("MagiBurst：所持 " + b(owned.length + "体"));
    const days = examDays();
    if (days != null) rows.push((X.S.profile.examName ? esc(X.S.profile.examName) + "まで" : "試験日まで") + " " + b(days + "日"));
    if (rows.length === 1) rows.push("まだ記録がありません。何から始めましょうか？");
    return {
      html: rows.join("<br>"),
      acts: [chip("苦手問題を出して", "xvSay('苦手な問題を出して')"),
             chip("タイマー", "xvGo('timer')"),
             chip("MagiBurst の編成", "xvSay('編成のコツ')")],
    };
  }

  /* ════════════════════════════════════════════
     学習プラン
     ════════════════════════════════════════════ */
  function planAnswer(text) {
    const min = X.parseMinutes(text);
    const p = X.buildPlan(min || 0);
    if (!p.items.length) {
      return { html: "プランを作るには、少しだけ材料が要ります。<br>「数学が苦手」のように教えてもらうか、MagiLex を少し進めてもらえると、あなた用のプランを組めます。",
        acts: [chip("苦手を登録する", "xvOpenWeak()"), chip("MagiLex をひらく", "location.href='../MagiLex/MagiLex.html'")] };
    }
    let h = "今日のプラン（合計 " + b(X.fmtMin(p.items.reduce((a, i) => a + i.min, 0))) + "）<table><tr><th>やること</th><th>時間</th></tr>";
    p.items.forEach((i) => { h += "<tr><td>" + esc(i.t) + "</td><td>" + X.fmtMin(i.min) + "</td></tr>"; });
    h += "</table>";
    if (p.why.length) h += note("▸ " + p.why.join("<br>▸ "));
    const first = p.items[0];
    return {
      byline: true,
      html: h,
      acts: [chip("プラン画面で見る", "xvGo('study')"),
             chip("この " + first.min + "分ではじめる", "xvStartTimer(" + first.min * 60 + ")")],
    };
  }

  /* ════════════════════════════════════════════
     タイマー（科目・目的の入力は不要。時間は自由）
     ════════════════════════════════════════════ */
  function timerAnswer(text) {
    const t = X.norm(text);
    if (/(止め|とめ|停止|やめ|りせっと|reset)/.test(t)) {
      return { html: "タイマーを止めますね。", acts: [chip("止める", "xvStopTimer()"), chip("タイマー画面", "xvGo('timer')")] };
    }
    const sec = X.parseSeconds(text);
    if (sec >= 5) {
      return {
        html: b(X.fmtSec(sec)) + " のタイマーを用意しました。",
        acts: [chip("スタート", "xvStartTimer(" + sec + ")"), chip("タイマー画面", "xvGo('timer')")],
      };
    }
    return {
      html: "何分にしますか？ <b>時間は自由に決められます</b>（1分でも3時間でも、秒単位でもOK）。<br>科目や目的の入力はいりません。",
      acts: [chip("10分", "xvStartTimer(600)"), chip("25分", "xvStartTimer(1500)"),
             chip("50分", "xvStartTimer(3000)"), chip("自分で決める", "xvGo('timer')")],
    };
  }

  /* ════════════════════════════════════════════
     学習の記録（任意）
     ════════════════════════════════════════════ */
  function logAnswer(text) {
    const min = X.parseMinutes(text);
    if (!min) {
      return { html: "記録は<b>つけたいときだけ</b>で大丈夫です。つけるなら「数学を45分やった」のように言ってください。",
        acts: [chip("記録画面を開く", "xvOpenLog()"), chip("記録を見る", "xvGo('report')")] };
    }
    const sub = X.pickSubject(text);
    X.addSession(min, sub, "");
    const t = X.todayMin();
    let h = "記録しました：" + b((sub ? sub + " " : "") + X.fmtMin(min)) + "<br>今日の合計 " + b(X.fmtMin(t)) + "。";
    return { html: h, acts: [chip("記録を見る", "xvGo('report')"), chip("続けてタイマー", "xvStartTimer(1500)")] };
  }

  /* 分析 */
  function reportAnswer() {
    const w = X.weekSeries();
    const total = w.reduce((a, x) => a + x.min, 0);
    if (!total) {
      return { html: "この1週間の記録はまだありません。<br>記録は任意なので、つけていなくても問題ありません。つけたいときは「45分やった」と言ってください。",
        acts: [chip("記録をつける", "xvOpenLog()"), chip("苦手問題を出して", "xvSay('苦手な問題を出して')")] };
    }
    const days = w.filter((x) => x.min > 0).length;
    const best = w.slice().sort((a, b2) => b2.min - a.min)[0];
    let h = "この1週間：" + b(X.fmtMin(total)) + "（学習した日 " + b(days + "日") + "／1日平均 " + X.fmtMin(total / 7) + "）";
    if (best && best.min) h += "<br>いちばん進んだ日：" + b((best.d.getMonth() + 1) + "/" + best.d.getDate()) + " " + X.fmtMin(best.min);
    const weak = X.weakList().slice(0, 3);
    if (weak.length) h += "<br>正答率が低い：" + weak.map((x) => esc(x.topic) + " " + Math.round(x.rate * 100) + "%").join("／");
    return { byline: true, html: h, acts: [chip("記録を見る", "xvGo('report')"), chip("苦手問題を出して", "xvSay('苦手な問題を出して')")] };
  }

  /* ════════════════════════════════════════════
     MagiLex — 状況・苦手問題の出題・解説
     ════════════════════════════════════════════ */
  function lexAnswer(text) {
    const t = X.norm(text);
    /* ① 出題してほしい */
    if (/(出題|問題|くいず|くいず出|出して|テスト|練習|といて|解きたい|やりたい|演習|ドリル)/.test(t)) {
      const n = (X.Z2H(text).match(/(\d{1,2})\s*問/) || [])[1];
      return {
        html: "苦手なところから出題します。<br>" +
          "MagiLex の記録を見て、<b>まだ習得していない問題</b>を優先して選びます（記録がなければ幅広く出します）。",
        acts: [chip((n ? n : 5) + "問はじめる", "xvStartQuiz(" + (n || 5) + ")"),
               chip("10問はじめる", "xvStartQuiz(10)"),
               chip("科目を選ぶ", "xvOpenQuizPick()")],
      };
    }
    /* ② 状況 */
    const lex = X.lexSummary();
    if (!lex) {
      return { html: "まだ MagiLex の学習データが見つかりません。<br>それでも<b>出題はできます</b>（MagiLex の問題データを直接読んで出します）。一度 MagiLex で解くと、あなたの苦手に合わせて選べるようになります。",
        acts: [chip("とりあえず5問出して", "xvStartQuiz(5)"), chip("MagiLex をひらく", "location.href='../MagiLex/MagiLex.html'")] };
    }
    const list = lex.contents.slice(0, 5);
    let h = "MagiLex の状況です。<br>完全習得：" + b(lex.masteredContents + "コンテンツ")
      + "／これまでの正答 " + b(lex.correct + "/" + lex.answered)
      + (lex.answered ? "（" + Math.round(lex.correct / lex.answered * 100) + "%）" : "");
    if (list.length) {
      h += "<table><tr><th>コンテンツ</th><th>習得</th><th>習得中</th></tr>";
      list.forEach((c) => { h += "<tr><td>" + esc(c.nm) + "</td><td>" + c.mastered + "</td><td>" + c.learning + "</td></tr>"; });
      h += "</table>" + note("「習得中」が多いものから片づけると、完全習得の XEVA が早く入ります。");
    }
    return { byline: true, html: h,
      acts: [chip("苦手から5問出して", "xvStartQuiz(5)"), chip("MagiLex をひらく", "location.href='../MagiLex/MagiLex.html'")] };
  }

  /* ════════════════════════════════════════════
     MagiBurst
     ════════════════════════════════════════════ */
  function charCard(c, owned) {
    const K = KB();
    let h = b(esc(c.nm)) + "（" + (K.EL_NM[c.el] || c.el) + "・" + (K.SHOT_NM[c.shot] || c.shot) + "・" + esc(c.type) + (c.star5 ? "・★5" : "") + "）"
      + (owned ? "　" + b("所持ずみ") : '　<span style="color:#9aa3c0">未所持</span>');
    h += "<br>アビリティ：" + c.abil.map((a) => esc(K.abilLabel(a))).join("／");
    if (c.ssName) h += "<br>フルバースト：" + esc(c.ssName);
    if (c.fsName) h += "<br>リンクスキル：" + esc(c.fsName);
    const anti = K.antiKeysOf(c.id);
    h += "<br>対策できるギミック：" + (anti.length ? b(anti.map((k) => K.COUNTER[k].nm).join("・")) : "なし");
    if (K.isOmni(c.id)) h += "<br>" + b("オムニアンチ") + "：WAVE開始から2回行動するまでは全ギミック無効（あくまで<b>時間制限つきの保険</b>で、専用アビリティの代わりにはなりません）";
    const tips = [];
    if (K.EL_STRONG[c.el]) tips.push((K.EL_NM[K.EL_STRONG[c.el]]) + "属性の敵に有利（与ダメージ ×" + K.EL_MUL + "）");
    const roles = K.rolesOf(c.abil).map((r) => K.ROLE_NM[r]);
    if (roles.length) tips.push("役割：" + roles.join("・"));
    if (!owned) { const w = K.poolText(c.id); if (w) tips.push("入手先：" + w); }
    if (tips.length) h += note("▸ " + tips.join("<br>▸ "));
    return h;
  }

  function burstCharAnswer(c) {
    const owned = X.burstOwned().some((o) => o.id === c.id);
    return {
      byline: true, html: charCard(c, owned),
      acts: [chip("活躍するクエスト", "xvSay('" + q(c.nm) + " が活躍できるクエスト')"),
             chip("MagiBurst をひらく", "location.href='../MagiBurst/index.html'")],
    };
  }

  /* ギミック対策 */
  function gimAnswer(key) {
    const K = KB();
    const nm = K.gimName(key);
    const tip = K.GIM_TIP[key] || "";
    let h = b(esc(nm)) + " の対策です。<br>";
    if (K.COUNTER[key]) {
      const owned = X.burstOwned();
      const mine = owned.filter((o) => K.counters(o.id, key));
      const all = K.countersFor(key);
      h += "アビリティで消せます：" + b(esc(K.COUNTER[key].label)) + "<br>";
      h += mine.length
        ? "あなたの所持キャラ：" + b(mine.map((o) => esc(o.nm)).join("・"))
        : "いまの所持キャラには対策持ちが居ません。";
      if (!mine.length || mine.length < 2) {
        const want = all.filter((o) => !owned.some((m) => m.id === o.id)).slice(0, 5);
        if (want.length) {
          h += "<br>狙うならこのあたり：<br>" + want.map((o) =>
            "・" + b(esc(o.nm)) + "（" + (K.EL_NM[o.el] || o.el) + "・" + (K.SHOT_NM[o.shot] || o.shot) + "）"
            + (K.poolText(o.id) ? " — " + K.poolText(o.id) : "")).join("<br>");
        }
      }
      const omni = owned.filter((o) => K.isOmni(o.id));
      if (omni.length) h += "<br>オムニアンチ持ち：" + esc(omni.map((o) => o.nm).join("・")) + "（2回行動するまでの<b>保険</b>）";
    }
    if (tip) h += "<br><br>" + b("対策キャラが居なくても") + "：" + tip;
    return { byline: true, html: h,
      acts: [chip("編成のコツ", "xvSay('編成のコツ')"), chip("クエスト別の編成", "xvSay('第12の間の編成')"),
             chip("迷宮・庭園も", "xvSay('幽冥の庭園 第7ノ園の編成')")] };
  }

  /* クエスト別の編成 — 理想 / 手持ち / 入手目標 の3段で返す */
  function stageAnswer(stage) {
    const K = KB();
    const r = X.suggestParty(stage);
    const gnames = stage.anti.map((k) => K.COUNTER[k] ? K.COUNTER[k].nm : k);
    let h = b(esc(stage.nm)) + "（" + esc(stage.diff) + "）<br>";
    h += "アンチギミック：" + (gnames.length ? b(gnames.join("・")) : "なし");
    if (stage.el) {
      const good = K.EL_COUNTER[stage.el];
      h += "<br>敵の属性：" + b(K.EL_NM[stage.el] || stage.el)
        + (good ? " → " + b(K.EL_NM[good] + "属性") + " で有利（与ダメージ ×" + K.EL_MUL + "）" : "");
    }
    const other = (stage.gims || []).filter((g) => stage.anti.indexOf(g) < 0 && K.GIM_TIP[g]);
    if (other.length) h += "<br>そのほかの仕掛け：" + other.map((g) => esc(K.gimName(g))).join("・");

    const line = (p, i) => {
      const covers = stage.anti.filter((k) => K.counters(p.id, k)).map((k) => K.COUNTER[k].label);
      return (i + 1) + ". " + b(esc(p.nm)) + "（" + (K.EL_NM[p.el] || p.el) + "・" + (K.SHOT_NM[p.shot] || p.shot) + "）"
        + (covers.length ? " → " + esc(covers.join("・")) : (K.isOmni(p.id) ? " → オムニアンチ（保険）" : ""));
    };

    /* ① 理想の編成（未所持でも見せる。これが「目標」になる） */
    h += "<br><br>" + b("🎯 理想の編成") + "（所持を問わず、このクエストに最も適した4体）<br>"
      + r.ideal.chars.map(line).join("<br>");
    h += "<br>" + verdict(r.ideal, stage, K);

    /* ② 手持ちでのベスト */
    if (r.mine) {
      h += "<br><br>" + b("🎒 いまの手持ちでのベスト") + "<br>" + r.mine.chars.map(line).join("<br>");
      h += "<br>" + verdict(r.mine, stage, K);
    } else {
      h += "<br><br>" + b("🎒 手持ちの編成") + "：所持キャラが4体そろっていないため、いまは出せません（" + r.ownedCount + "体）。";
    }

    /* ③ 入手すべきキャラ */
    const miss = r.mine ? r.mine.missing : stage.anti;
    if (miss.length) {
      h += "<br><br>" + b("🎁 入手できると一気に楽になるキャラ");
      miss.forEach((k) => {
        const list = (r.targets[k] || []).filter((x) => !x.owned).slice(0, 3);
        if (!list.length) return;
        h += "<br>▸ " + b(K.COUNTER[k] ? K.COUNTER[k].nm : k) + " 対策：<br>"
          + list.map((x) => "　・" + b(esc(x.nm)) + "（" + (K.EL_NM[x.el] || x.el) + "・" + (K.SHOT_NM[x.shot] || x.shot) + "）"
            + (x.where ? " — " + x.where : "")).join("<br>");
      });
    }

    X.S.burst.asks.push({ stage: stage.id, at: Date.now() }); X.save();
    return { byline: true, html: h,
      acts: [chip("勝てないときのコツ", "xvSay('" + q(stage.nm) + " で勝てない')"),
             chip("編成のコツ", "xvSay('編成のコツ')"),
             chip("MagiBurst をひらく", "location.href='../MagiBurst/index.html'")] };
  }

  /* 編成の評価を1行にまとめる。★ omni は「対策できている」と言い切らないこと。 */
  function verdict(a, stage, K) {
    const parts = [];
    if (!stage.anti.length) parts.push("このクエストにアンチギミックはありません。");
    else if (!a.missing.length && !a.viaOmni.length) parts.push("✅ ギミックは<b>すべて専用アビリティで対策</b>できています。");
    else {
      if (a.viaOmni.length) {
        parts.push("⚠️ " + b(a.viaOmni.map((k) => K.COUNTER[k].nm).join("・"))
          + " は<b>オムニアンチ頼み</b>です（WAVE開始から2回行動するまでの限定なので、長いWAVEでは無防備になります）。");
      }
      if (a.missing.length) {
        parts.push("❌ " + b(a.missing.map((k) => K.COUNTER[k].nm).join("・")) + " は<b>対策できていません</b>。");
      }
    }
    if (stage.el && a.advantage === 0) parts.push("属性有利を取れる子が居ません（入れられると与ダメージが ×" + K.EL_MUL + " になります）。");
    if (a.shots.length === 1 && (stage.gims || []).indexOf("passblock") >= 0)
      parts.push("撃種限定ブロックのある部屋なので、<b>反射と貫通を混ぜる</b>必要があります。");
    if (a.roles.indexOf("heal") < 0) parts.push("回復役が居ません。長期戦になるなら1体入れたいところです。");
    return note(parts.length ? parts.join("<br>") : "バランスの取れた編成です。");
  }

  /* 勝てないときのコツ */
  function loseAnswer(stage) {
    const K = KB();
    let h = stage ? b(esc(stage.nm)) + " で勝てないときは、この順に見直すと原因が絞れます。<br>"
                  : "勝てないときは、この順に見直すと原因が絞れます。<br>";
    if (stage) {
      const r = X.suggestParty(stage);
      const a = r.mine || r.ideal;
      const bad = [];
      if (a.missing.length) bad.push("<b>" + a.missing.map((k) => K.COUNTER[k].nm).join("・") + " の対策が無い</b>");
      if (a.viaOmni.length) bad.push("<b>" + a.viaOmni.map((k) => K.COUNTER[k].nm).join("・") + " がオムニアンチ頼み</b>");
      if (stage.el && a.advantage === 0) bad.push("<b>属性有利を取れていない</b>（" + (K.EL_NM[K.EL_COUNTER[stage.el]] || "") + "属性が有利）");
      if (a.roles.indexOf("heal") < 0) bad.push("<b>回復役が居ない</b>");
      if (bad.length) {
        h += "<br>いまの編成で見えている問題：<br>・" + bad.join("<br>・") + "<br>";
      }
      (stage.gims || []).slice(0, 4).forEach((g) => {
        if (K.GIM_TIP[g]) h += "<br>▸ " + b(K.gimName(g)) + "：" + K.GIM_TIP[g];
      });
      h += "<br>";
    }
    h += "<br>" + K.LOSE_TIPS.map((t, i) => (i + 1) + ". " + b(t[0]) + " — " + t[1]).join("<br>");
    return { byline: true, html: h,
      acts: (stage ? [chip("このクエストの編成", "xvSay('" + q(stage.nm) + "の編成')")] : [])
        .concat([chip("編成のコツ", "xvSay('編成のコツ')"), chip("MagiBurst をひらく", "location.href='../MagiBurst/index.html'")]) };
  }

  /* 編成の組み方（未所持でも役に立つ原則） */
  function partyRuleAnswer() {
    const K = KB();
    let h = "編成は、この順番で考えると外しません。<br><br>"
      + K.PARTY_RULES.map((r) => b(r[0]) + "<br>" + r[1]).join("<br><br>");
    h += note("MagiBurst のクエスト画面にある<b>自動編成</b>は、①〜②を機械的にやってくれます。まず自動編成 → 1枠だけ好きなキャラに差し替える、が実戦では最速です。");
    return { byline: true, html: h,
      acts: [chip("クエスト別の編成", "xvSay('第12の間の編成')"),
             chip("勝てないときのコツ", "xvSay('勝てない')"),
             chip("MagiBurst をひらく", "location.href='../MagiBurst/index.html'")] };
  }

  /* そのキャラが活きるクエスト */
  function charStageAnswer(c) {
    const K = KB();
    const anti = K.antiKeysOf(c.id);
    const full = K.STAGES.filter((s) => s.anti.length && s.anti.every((k) => anti.indexOf(k) >= 0));
    const half = K.STAGES.filter((s) => s.anti.length && full.indexOf(s) < 0 && s.anti.some((k) => anti.indexOf(k) >= 0));
    const elGood = K.STAGES.filter((s) => s.el && K.EL_STRONG[c.el] === s.el);
    let h = b(esc(c.nm)) + "（" + (K.EL_NM[c.el] || c.el) + "・" + (K.SHOT_NM[c.shot] || c.shot) + "）が活きる場所です。<br>";
    h += "<br>" + b("1体でギミックを全部まかなえるクエスト") + "<br>"
      + (full.length ? full.slice(0, 8).map((s) => "・" + esc(s.nm) + "（" + s.diff + "）").join("<br>") : "ありません。");
    if (half.length) h += "<br><br>" + b("片方のギミックを担当できるクエスト") + "<br>" + half.slice(0, 6).map((s) => "・" + esc(s.nm)).join("<br>");
    if (elGood.length) h += "<br><br>" + b("属性有利を取れるクエスト") + "（敵が" + (K.EL_NM[K.EL_STRONG[c.el]]) + "属性）<br>"
      + elGood.slice(0, 6).map((s) => "・" + esc(s.nm)).join("<br>");
    if (K.isOmni(c.id)) h += note("オムニアンチ持ちなので、対策の穴を一時的に埋める使い方もできます。ただし2回行動するまでの限定です。");
    return { byline: true, html: h, acts: [chip("MagiBurst をひらく", "location.href='../MagiBurst/index.html'")] };
  }

  /* キャラの入手先 */
  function obtainAnswer(c) {
    const K = KB();
    const owned = X.burstOwned().some((o) => o.id === c.id);
    const where = K.poolText(c.id);
    let h = b(esc(c.nm)) + " の入手先です。<br>";
    h += where ? where : "入手先の情報がありません。";
    if (owned) h += "<br>" + b("すでに所持しています") + "。重ねて入手すると凸（限界突破）が進みます。";
    const ps = K.poolsOf(c.id);
    ps.forEach((p) => { if (K.POOL_NM[p]) h += note(b(K.POOL_NM[p][0]) + " — " + K.POOL_NM[p][1]); });
    return { byline: true, html: h,
      acts: [chip("性能を見る", "xvSay('" + q(c.nm) + "の性能')"), chip("MagiBurst をひらく", "location.href='../MagiBurst/index.html'")] };
  }

  /* MagiBurst のざっくり案内 */
  function burstHome() {
    const owned = X.burstOwned();
    return {
      html: "MagiBurst のことなら、" + b("クエストの編成") + "・" + b("ギミック対策") + "・" + b("キャラの性能") + "・"
        + b("入手先") + "・" + b("勝てないときのコツ") + " に答えられます。<br>"
        + (owned.length ? "いまの所持キャラは " + b(owned.length + "体") + " です。<br>" : "")
        + "クエストは <b>黄昏の王城</b>／<b>禁忌の迷宮</b>／<b>幽冥の庭園</b> の3系統ぜんぶ答えられます。<br>"
        + "例：" + b("王城14の間の編成") + "　" + b("迷宮22の間の編成") + "　" + b("庭園の第7ノ園") + "　" + b("重力バリアの対策"),
      acts: [chip("編成のコツ", "xvSay('編成のコツ')"), chip("王城 第14の間", "xvSay('黄昏の王城 第14の間の編成')"),
             chip("迷宮 第22の間", "xvSay('禁忌の迷宮 第22の間の編成')"),
             chip("庭園 第7ノ園", "xvSay('幽冥の庭園 第7ノ園の編成')"),
             chip("勝てないときは", "xvSay('勝てない')")],
    };
  }

  /* ════════════════════════════════════════════
     XEVARION（ポータル・各アプリ）の質問
     ════════════════════════════════════════════ */
  function appAnswer(a) {
    let h = b(esc(a.nm)) + "（" + esc(a.cat) + "）<br>" + a.sum + "<br><br>" + a.det;
    const acts = [chip(a.nm + " をひらく", "location.href='" + a.href + "'")];
    if (a.id === "magiburst") acts.push(chip("編成のコツ", "xvSay('編成のコツ')"));
    if (a.id === "magilex") acts.push(chip("苦手問題を出して", "xvStartQuiz(5)"));
    return { byline: true, html: h, acts };
  }
  function retiredAnswer(nm) {
    return {
      html: b(esc(nm)) + " は <b>2026年7月29日</b> をもって<b>サービスを終了</b>しました。<br>"
        + "獲得済みの XEVA・ジェム・キャラクターはそのまま残っており、他のアプリで使えます。<br>"
        + "セーブデータもアカウント内に保管されていて、こちらから削除することはありません。",
      acts: [chip("いま遊べるアプリ", "xvSay('どんなアプリがある？')"), chip("XEVARION へ", "location.href='../index.html'")],
    };
  }
  function faqAnswer(f) {
    let h = b(esc(f.t)) + "<br>" + f.a;
    if (f.id === "xeva") h += "<br>いまの残高：" + b(X.DATA.xeva().toLocaleString() + " XEVA");
    if (f.id === "gem") h += "<br>いまの所持：" + GEM + b(X.DATA.gem().toLocaleString());
    const acts = [chip("XEVARION へ", "location.href='../index.html'")];
    if (f.id === "gem" || f.id === "gacha") acts.unshift(chip("MagiBurst をひらく", "location.href='../MagiBurst/index.html'"));
    return { html: h, acts };
  }
  function appListAnswer() {
    const K = KB();
    const cats = {};
    K.APPS.forEach((a) => { (cats[a.cat] = cats[a.cat] || []).push(a); });
    let h = "いま遊べる・使える XEVARION のアプリです。<br>";
    Object.keys(cats).forEach((c) => {
      h += "<br>" + b(esc(c)) + "<br>" + cats[c].map((a) => "・" + b(esc(a.nm)) + " — " + esc(a.sum)).join("<br>");
    });
    h += note("MagiResonance・MagiShareCore・MagiTriad・MagiMuse・MagiFinance・MagiSports は 2026-07-29 にサービスを終了しました。");
    return { html: h, acts: [chip("XEVARION へ", "location.href='../index.html'")] };
  }

  /* ════════════════════════════════════════════
     わからない問題（解説）
     ════════════════════════════════════════════ */
  function questionAnswer(text) {
    const t = String(text || "").trim();
    X.S.qa.push({ q: t.slice(0, 200), a: "", at: Date.now() }); X.save();
    /* MagiLex のデータに載っている問題なら、そのまま解説できる。
       非同期なので、画面側に「調べています」を出させてから差し替える。 */
    return { html: "", explain: t };
  }
  /* 見つかった項目を解説の形にする（xevynar-app.js から呼ぶ） */
  function explainCard(hit) {
    if (!hit) return null;
    if (hit.kind === "quiz") {
      let h = "MagiLex「" + esc(hit.secName) + "」に載っています。<br><br>"
        + b(esc(hit.stem)) + (hit.reading ? " " + esc(hit.reading) : "") + "<br>"
        + "→ " + b(esc(hit.answer));
      if (hit.extra) h += note("💡 " + esc(hit.extra));
      return h;
    }
    let h = "MagiLex「" + esc(hit.subjName) + "」に載っています。<br><br>"
      + b(esc(hit.word)) + "（" + esc(hit.frontLabel) + "）<br>→ " + b(esc(hit.meaning));
    return h;
  }
  /* データに無いときの、解き方の道すじ */
  function solvePath(text) {
    const sub = X.pickSubject(text);
    let h = "";
    if (sub) h += b(esc(sub)) + "の問題ですね。<br>";
    h += "手元のデータには載っていませんでした。<b>答えを勝手に作らない</b>ようにしているので、代わりに解き方の道すじを一緒に整理します。<br><br>"
      + "① わかっていること（式・条件・数値）を書き出す<br>"
      + "② 求めるものを1つに絞る<br>"
      + "③ ①と②をつなぐ公式・定理を探す<br>"
      + "④ 見つからないときは、似た例題をさがす<br><br>"
      + "①と②を書いてもらえれば、③の候補をいっしょに挙げます。";
    return h;
  }

  /* ════════════════════════════════════════════
     MagiLink（返信案）
     ════════════════════════════════════════════ */
  function linkAnswer(text) {
    const names = Object.keys(X.S.link);
    if (/(返信|返事|なんて返|何て返|返そう|リプ)/.test(text)) {
      const last = lastLinkMsg();
      if (!last) {
        return { html: "返信案を作るには、相手のメッセージを教えてください。<br>MagiLink の会話を貼り付けてもらえれば、口調に合わせた案を3つ出します。",
          acts: [chip("会話を貼り付ける", "xvOpenLink()"), chip("MagiLink をひらく", "location.href='../MagiLink/MagiLink.html'")] };
      }
      return { byline: true, html: replyDrafts(last.t, last.who), acts: [chip("別の案", "xvSay('別の返信案')"), chip("会話を追加", "xvOpenLink()")] };
    }
    if (names.length) {
      let h = "覚えている会話：<br>" + names.slice(0, 6).map((n) => "・" + esc(n) + "（" + (X.S.link[n].msgs || []).length + "件）").join("<br>");
      h += "<br><br>「" + esc(names[0]) + "への返信を考えて」のように言ってください。";
      return { html: h, acts: [chip("返信案を作る", "xvSay('返信を考えて')"), chip("会話を追加", "xvOpenLink()")] };
    }
    return { html: "MagiLink の会話を覚えておくと、口調に合わせた返信案を作れます。まずは会話を1つ登録してみてください。",
      acts: [chip("会話を登録する", "xvOpenLink()"), chip("MagiLink をひらく", "location.href='../MagiLink/MagiLink.html'")] };
  }
  function lastLinkMsg() {
    let best = null;
    Object.keys(X.S.link).forEach((n) => {
      (X.S.link[n].msgs || []).forEach((m) => { if (m.who !== "me" && (!best || m.at > best.at)) best = { t: m.t, who: n, at: m.at }; });
    });
    return best;
  }
  function replyDrafts(msg, who) {
    const m = String(msg || "");
    const polite = /(です|ます|ください|でしょうか|ですか)/.test(m);
    const emoji = /[\u{1F300}-\u{1FAFF}]|[！!]{1,}/u.test(m);
    const e = (s) => emoji ? s : s.replace(/[😊🙌✨]/g, "").trim();
    const ask = /[?？]|かな|どう|いつ|どこ|なに|何/.test(m);
    let drafts;
    if (ask) {
      drafts = polite
        ? ["ありがとうございます！確認して、あとで連絡しますね😊", "すみません、少し考えてから返信します！", "大丈夫です！詳しく教えてもらえますか？"]
        : ["ありがとう！あとで確認して連絡するね😊", "ちょっと考えてから返すね！", "いいよ！もう少し詳しく教えて？"];
    } else {
      drafts = polite
        ? ["ありがとうございます！助かりました😊", "了解しました！こちらでも進めておきますね", "うれしいです！またよろしくお願いします✨"]
        : ["ありがとう！助かった😊", "了解！こっちでも進めておくね", "うれしい！またよろしく✨"];
    }
    return "「" + esc(who || "相手") + "」の最後のメッセージ：<br><span style='color:#6b7597'>" + esc(m.slice(0, 80)) + (m.length > 80 ? "…" : "") + "</span>"
      + "<br><br>口調に合わせた返信案（" + (polite ? "ていねい" : "くだけた") + "）：<br>"
      + drafts.map((d, i) => (i + 1) + ". " + esc(e(d))).join("<br>");
  }

  /* できることの案内 */
  function helpAnswer() {
    return {
      html: greet() + "。XEVYNAR です。こんなことができます。<br>"
        + "① " + b("勉強") + "：今日のプラン／自由に決められるタイマー（<b>科目や目的の入力は不要</b>）<br>"
        + "② " + b("わからない問題") + "：MagiLex のデータから解説、載っていなければ解き方の道すじ<br>"
        + "③ " + b("苦手問題の出題") + "：あなたの MagiLex の記録から、まだ習得していない問題を出します<br>"
        + "④ " + b("MagiBurst") + "：編成（理想＋手持ち＋入手目標）・ギミック対策・勝てないときのコツ<br>"
        + "⑤ " + b("XEVARION のこと") + "：アプリ・XEVA・" + GEM + "ジェム・同期・オフライン・ガチャ など<br>"
        + "⑥ " + b("MagiLink") + "：会話に合わせた返信案<br><br>"
        + "記録をつけるかどうかは<b>自由</b>です。つけなくても全部使えます。",
      acts: [chip("苦手問題を出して", "xvStartQuiz(5)"), chip("25分タイマー", "xvStartTimer(1500)"),
             chip("編成のコツ", "xvSay('編成のコツ')"), chip("ジェムって何？", "xvSay('ジェムって何？')")],
    };
  }

  /* ════════════════════════════════════════════
     意図の判定（スコア式）
     ════════════════════════════════════════════ */
  /* 各意図の手がかり語。ひらがなに正規化してから比べるので、
     カタカナ・漢字・半角どれで書かれても当たる。 */
  const INTENTS = [
    { id: "help",    k: ["できること", "なにができ", "何ができ", "使い方", "つかいかた", "へるぷ", "help", "はじめ", "きみは", "あなたは", "だれ", "自己紹介"] },
    { id: "greet",   k: ["こんにちは", "こんばんは", "おはよう", "やあ", "hi", "hello", "はろー", "ただいま", "おつかれ"] },
    { id: "status",  k: ["状況", "じょうきょう", "ステータス", "いまの", "今の", "残高", "所持", "どれくらい持って", "調子"] },
    { id: "timer",   k: ["タイマー", "たいまー", "timer", "ポモドーロ", "ぽもどーろ", "はかって", "測って", "計って", "集中したい", "カウントダウン", "アラーム", "あらーむ"] },
    { id: "plan",    k: ["プラン", "ぷらん", "計画", "けいかく", "何をやれ", "なにをやれ", "何やれ", "なにやれ", "やること", "スケジュール", "予定を組", "組んで"] },
    { id: "log",     k: ["記録", "きろく", "ログ", "つけて", "やった", "終わった", "おわった", "勉強した", "やりました"] },
    { id: "report",  k: ["分析", "ぶんせき", "今週", "こんしゅう", "先週", "どれくらい勉強", "進捗", "グラフ", "統計", "ふりかえ", "振り返"] },
    { id: "quiz",    k: ["出題", "しゅつだい", "問題を出", "もんだいを出", "クイズ", "くいず", "テストして", "練習", "演習", "ドリル", "解きたい", "といて", "問題ちょうだい", "苦手な問題", "苦手問題"] },
    { id: "lex",     k: ["magilex", "マギレックス", "れっくす", "単語", "たんご", "英単語", "習得", "しゅうとく", "苦手", "にがて", "克服"] },
    { id: "burst",   k: ["magiburst", "マギバースト", "ばーすと", "編成", "へんせい", "パーティ", "ぱーてぃ", "ギミック", "アンチ", "降臨", "王城", "迷宮", "庭園", "クエスト", "どのキャラ", "だれを入れ"] },
    { id: "lose",    k: ["勝てない", "かてない", "勝てん", "むずかしい", "難しい", "クリアできない", "くりあできない", "詰ん", "つん", "負ける", "まける", "全滅", "コツ", "こつ", "攻略", "こうりゃく"] },
    { id: "party",   k: ["編成のコツ", "編成の組み方", "組み方", "くみかた", "編成って", "どう組め", "編成方法"] },
    { id: "link",    k: ["magilink", "マギリンク", "返信", "へんしん", "返事", "リプ", "メッセージ", "line"] },
    { id: "gem",     k: ["ジェム", "じぇむ", "gem", "宝石"] },
    { id: "xeva",    k: ["xeva", "ゼヴァ", "ぜゔぁ", "コイン", "通貨", "つうか", "残高"] },
    { id: "apps",    k: ["どんなアプリ", "アプリ一覧", "なにがある", "何がある", "アプリある", "全部のアプリ", "ほかのアプリ"] },
    { id: "explain", k: ["解説", "かいせつ", "教えて", "おしえて", "わからない", "分からない", "わかんない", "なぜ", "なんで", "どうして", "とは", "意味", "解き方", "ときかた"] },
  ];

  function scoreIntents(raw) {
    const K = KB();
    const k = K ? K.kana(raw) : X.norm(raw);
    const out = {};
    INTENTS.forEach((it) => {
      let s = 0;
      it.k.forEach((w) => {
        const n = K ? K.kana(w) : X.norm(w);
        if (n.length >= 2 && k.indexOf(n) >= 0) s += n.length + (k === n ? 6 : 0);
      });
      if (s) out[it.id] = s;
    });
    return out;
  }

  function route(text) {
    const raw = String(text || "").trim();
    if (!raw) return { html: "何でも聞いてください。" };
    const K = KB();
    const sc = scoreIntents(raw);
    const top = Object.keys(sc).sort((a, b2) => sc[b2] - sc[a])[0] || "";

    /* ── 具体的な対象が文中にあるときは、意図スコアより優先する ──
       「クロエの性能」「第12の間の編成」のように対象がはっきりしていれば、
       どの言い回しで来ても正しい答えに着地させたい。 */
    const stage = K ? K.findStage(raw) : null;
    const gim = K ? K.findGim(raw) : null;
    /* キャラ名は助詞や語尾を落としてから当てる */
    const charQ = raw.replace(/(の性能|の能力|について|ってどう|はどう|を教えて|教えて|どんな|使い方|は\?|\?|？)/g, "");
    const char = K ? K.findChar(charQ) : null;

    /* ★ 「編成のコツ」は lose（コツ）にも burst（編成）にも当たる。
       先に party を見ないと、編成の組み方を聞かれたのに敗因チェックリストを返してしまう。 */
    if (sc.party || (!stage && sc.burst && /くみかた|組み方|どう組|かんがえかた|考え方|きほん|基本/.test(K.kana(raw))))
      return partyRuleAnswer();
    /* 勝てない・攻略 */
    if (sc.lose && (stage || sc.burst || sc.lose >= 6)) return loseAnswer(stage);

    if (char) {
      const ck = K.kana(raw);
      if (/どこ|入手|とれる|取れる|手に入|出る|排出|ガチャ/.test(ck)) return obtainAnswer(char);
      if (/活躍|活きる|向いて|おすすめ|使える|どこで使/.test(ck)) return charStageAnswer(char);
      /* 名前だけ、または性能を聞かれている */
      if (/性能|能力|強い|つよい|どんな|アビリティ|使い方|どう/.test(ck) || ck.length <= K.kana(char.nm).length + 3)
        return burstCharAnswer(char);
    }
    if (stage) return stageAnswer(stage);
    if (gim && !sc.quiz) return gimAnswer(gim);

    /* アプリ・FAQ（ポータルの質問） */
    const retired = K.findRetired(raw);
    if (retired) return retiredAnswer(retired);
    const app = K.findApp(raw);
    if (app && !sc.quiz && !sc.timer) {
      if (app.id === "magiburst" && (sc.burst || sc.lose)) return burstHome();
      if (app.id === "magilex" && sc.quiz) return lexAnswer(raw);
      return appAnswer(app);
    }

    switch (top) {
      case "help":   return helpAnswer();
      case "greet":  return helpAnswer();
      case "timer":  return timerAnswer(raw);
      case "quiz":   return lexAnswer(raw);
      case "plan":   return planAnswer(raw);
      case "log":    return X.parseMinutes(raw) ? logAnswer(raw) : reportAnswer();
      case "report": return reportAnswer();
      case "lex":    return lexAnswer(raw);
      case "burst":  return burstHome();
      case "lose":   return loseAnswer(null);
      case "party":  return partyRuleAnswer();
      case "link":   return linkAnswer(raw);
      case "apps":   return appListAnswer();
      case "status": return statusAnswer();
      default: break;
    }

    /* FAQ（XEVA・ジェム・同期・オフライン…） */
    const faq = K.findFaq(raw);
    if (faq) return faqAnswer(faq);

    /* 質問（解説）— 最後に回す。MagiLex のデータを非同期で探す。 */
    if (sc.explain || /[?？]$/.test(raw) || raw.length >= 6) return questionAnswer(raw);

    /* どれにも当てはまらないとき */
    return {
      html: "うまく受け取れませんでした。こんな言い方だと確実です。<br>"
        + "・" + b("苦手な問題を5問出して") + "<br>"
        + "・" + b("25分はかって") + "<br>"
        + "・" + b("第12の間の編成") + "（迷宮・庭園も答えられます）<br>"
        + "・" + b("重力バリアの対策") + "<br>"
        + "・" + b("ジェムって何？"),
      acts: [chip("できること", "xvSay('できること')"), chip("苦手問題を出して", "xvStartQuiz(5)")],
    };
  }

  /* 自己申告（「数学が苦手」「志望校は〇〇」）への受け答え */
  function profileAnswer(learned) {
    const weak = X.S.memory.filter((m) => m.k.indexOf("苦手:") === 0).map((m) => m.v);
    let h = learned.map(esc).join("<br>") + "<br><br>";
    if (weak.length) h += "この内容はプランと出題に反映します（" + b(weak.map(esc).join("・")) + " を先に出します）。";
    else h += "覚えた内容はプランや提案に反映していきます。";
    return { html: h, acts: [chip("苦手問題を出して", "xvStartQuiz(5)"), chip("覚えていることを見る", "xvGo('study')")] };
  }

  /* 外から呼ぶ入口 */
  function respond(text) {
    const learned = X.autoLearn(String(text || ""));
    if (learned.length && /(苦手|得意|志望|目標|毎日|1日|一日|テスト|試験)/.test(String(text))) {
      const r = profileAnswer(learned);
      r.learned = null;
      return r;
    }
    let r;
    try { r = route(text) || { html: "…" }; }
    catch (e) { r = { html: "うまく答えられませんでした。別の言い方で聞いてもらえますか。" }; }
    r.learned = learned;
    return r;
  }

  window.XVTalk = {
    respond, route, helpAnswer, statusAnswer, replyDrafts, greet,
    explainCard, solvePath, appListAnswer, partyRuleAnswer,
  };
})();
