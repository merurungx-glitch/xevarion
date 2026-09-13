/* ══════════════════════════════════════════════════════════════
   mb-create-test.js — TEST PLAY（自由テストプレイ／デバッグ）
   ------------------------------------------------------------
   ★ このアプリのいちばん大事なところ（ご指定）。
     「好きなキャラ／好きなパーティー／好きな育成状態／好きな WAVE／好きなテストポイント」を
     <b>毎回自由にえらんで開始</b>できるようにする。
   ★ しくみ
     ① MBQ（エディタの持ちもの）を toStage() で<b>本物のステージの形</b>へ写す
     ② window.MBC_STAGES に入れる（index.html の findStage がここも探す）
     ③ 編成（DB.party）を一時的に差しかえ、育成状態を ball.st に上書きして startBattleNow
     ④ 終わったら<b>もとの編成にもどす</b>（テストのために本物のセーブを汚さない）
   ★ 「6WAVE すべてを毎回最初からプレイする必要をなくす」ため、
     開始 WAVE と<b>テストポイント（WAVE開始／◯ターン経過後）</b>をえらべる。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var M = window.MBCreate;
  if (!M || M._testDone) return;
  M._testDone = 1;

  var U = M._u, T = M._tables, V = M._V, S = M._S;
  var el = U.el, esc = U.esc, uid = U.uid, clamp = U.clamp, num = U.num, toast = U.toast;
  var openSheet = U.openSheet, closeSheet = U.closeSheet, setTitle = U.setTitle;
  var save = M._save, curQ = M._curQ, go = M.go;

  /* ★★ mb-core.js / index.html の <b>const ・ let は window に出ない</b>。
     CHARS・CHAR_IDSは const、DB・B は let なので window.CHARS では<b>とれない</b>
     （実際に編成が空になっていた）。<b>素の名前</b>で見ること。
     このファイルは遅延読みこみなので、先に読まれたスクリプトの
     トップレベルの const/let は同じスクリプトスコープにいる（見える）。 */
  function GCHARS() { try { return (typeof CHARS !== "undefined") ? CHARS : null; } catch (e) { return null; } }
  function GIDS() { try { return (typeof CHAR_IDS !== "undefined") ? CHAR_IDS : []; } catch (e) { return []; } }
  function GDB() { try { return (typeof DB !== "undefined") ? DB : null; } catch (e) { return null; } }
  function GB() { try { return (typeof B !== "undefined") ? B : null; } catch (e) { return null; } }

  /* テスト中の一時状態（終わったら必ず戻す） */
  var TP = null;

  function opts(list, cur, kk, nk) {
    kk = kk || "k"; nk = nk || "nm";
    return list.map(function (x) {
      var k = (typeof x === "object") ? x[kk] : x, n = (typeof x === "object") ? x[nk] : x;
      return '<option value="' + esc(k) + '"' + (String(k) === String(cur) ? " selected" : "") + ">" + esc(n) + "</option>";
    }).join("");
  }
  function row(label, inner) { return '<div class="mbc-row"><label>' + esc(label) + "</label>" + inner + "</div>"; }
  function rowW(label, inner) { return '<div class="mbc-row wide col"><label>' + esc(label) + "</label>" + inner + "</div>"; }

  /* MagiBurst のキャラ一覧（本物） */
  function gameChars() {
    try {
      var C = GCHARS(), ids = GIDS();
      if (!C || !ids.length) return [];
      return ids.filter(function (id) { return C[id]; })
        .map(function (id) { return { k: id, nm: C[id].nm }; });
    } catch (e) { return []; }
  }
  /* いま持っている編成（DB.party）を初期値にする */
  function defaultParty() {
    try {
      var db = GDB();
      if (db && Array.isArray(db.party) && db.party.length) return db.party.slice(0, 4);
    } catch (e) {}
    var g = gameChars();
    return g.slice(0, 4).map(function (x) { return x.k; });
  }

  function curPreset() {
    if (!V.preset) {
      V.preset = M._newPreset();
      V.preset.party = defaultParty();
    }
    if (!V.preset.party || !V.preset.party.length) V.preset.party = defaultParty();
    return V.preset;
  }

  /* ══════════════════════════════════════════════════════════
     TEST PLAY SETTINGS
     ══════════════════════════════════════════════════════════ */
  M.renderTestImpl = function (b) {
    var q = curQ(); if (!q) { go("list"); return; }
    var p = curPreset();
    var gc = gameChars();
    setTitle("TEST PLAY SETTINGS", q.nm);
    b.innerHTML =
      '<div class="mbc-panel"><h3>使用キャラクター<span>4体まで</span></h3>' +
        [0, 1, 2, 3].map(function (i) {
          return row("キャラ" + (i + 1),
            '<select class="mbc-sel" data-p="' + i + '"><option value="">（なし）</option>' +
            opts(gc, p.party[i] || "") +
            (S.chars.length ? '<optgroup label="オリジナル">' + opts(S.chars.map(function (c) {
              return { k: "mbc:" + c.id, nm: c.nm + "（自作）" };
            }), p.party[i] || "") + "</optgroup>" : "") + "</select>");
        }).join("") +
        '<div class="mbc-btns"><button class="mbc-btn" id="tpMine">保存済みパーティーを使用</button>' +
        '<button class="mbc-btn" id="tpAuto">おまかせ（強い順）</button></div>' +
      "</div>" +
      '<div class="mbc-panel"><h3>育成状態</h3>' +
        rowW("かんたん設定", '<div class="mbc-chips" id="tpMode">' + [
          { k: "none", nm: "未育成状態" }, { k: "lv50", nm: "レベル50" }, { k: "lv100", nm: "レベル100" },
          { k: "max", nm: "最大育成状態" }, { k: "atk", nm: "攻撃力だけ最大" }, { k: "free", nm: "自由入力" },
        ].map(function (m) {
          return '<button data-m="' + m.k + '" class="' + (p.mode === m.k ? "on" : "") + '">' + esc(m.nm) + "</button>";
        }).join("") + "</div>") +
        '<div class="mbc-grid2">' +
          row("レベル", '<input class="mbc-in num" data-t="lv" type="number" min="1" max="120" value="' + (p.lv | 0) + '">') +
          row("HP %", '<input class="mbc-in num" data-t="hpP" type="number" value="' + (p.hpP | 0) + '">') +
          row("攻撃力 %", '<input class="mbc-in num" data-t="atkP" type="number" value="' + (p.atkP | 0) + '">') +
          row("速度 %", '<input class="mbc-in num" data-t="spdP" type="number" value="' + (p.spdP | 0) + '">') +
          row("アビリティ", '<select class="mbc-sel" data-t="abil">' + opts([{ k: 1, nm: "ON" }, { k: 0, nm: "OFF" }], p.abil) + "</select>") +
          row("装備", '<select class="mbc-sel" data-t="gear">' + opts([{ k: 1, nm: "あり" }, { k: 0, nm: "なし" }], p.gear) + "</select>") +
        "</div>" +
      "</div>" +
      '<div class="mbc-panel"><h3>テスト開始地点</h3>' +
        rowW("開始WAVE", '<div class="mbc-chips" id="tpW">' + [1, 2, 3, 4, 5, 6].map(function (n) {
          return '<button data-w="' + n + '" class="' + (V.testWave === n ? "on" : "") +
            (n > clamp(q.waveN | 0, 1, 6) ? '" disabled style="opacity:.35' : "") + '">WAVE ' + n + " から開始</button>";
        }).join("") + "</div>") +
        rowW("テストポイント", '<select class="mbc-sel" id="tpPoint">' + opts([
          { k: "start", nm: "WAVE開始時" }, { k: "t3", nm: "3ターン経過後" },
          { k: "t5", nm: "5ターン経過後" }, { k: "ev", nm: "特定イベント発生直前（1つ目）" }], p.point || "start") + "</select>") +
      "</div>" +
      '<div class="mbc-panel"><h3>テスト条件プリセット</h3>' +
        '<div class="mbc-list">' + (S.presets.length ? S.presets.map(function (x) {
          return '<div class="mbc-item"><span class="ic">📌</span>' +
            '<span class="tx" data-pl="' + x.id + '"><b>' + esc(x.nm) + "</b><small>" +
            (x.party || []).length + "体 ・ " + esc(x.mode) + " ・ WAVE " + (x.startWave | 0 || 1) + "</small></span>" +
            '<span class="act"><button data-pd="' + x.id + '" class="dan">🗑</button></span></div>';
        }).join("") : '<div class="mbc-note">「初心者パーティ」「最大育成パーティ」など、条件を保存しておけます。</div>') + "</div>" +
        '<div class="mbc-row" style="margin-top:9px"><input class="mbc-in" id="tpNm" placeholder="プリセット名" value="' + esc(p.nm) + '">' +
        '<button class="mbc-btn" id="tpSave">保存</button></div>' +
      "</div>" +
      '<div class="mbc-btns"><button class="mbc-btn go full" id="tpGo" style="padding:14px">▶ テスト開始</button></div>';

    b.querySelectorAll("[data-p]").forEach(function (e) {
      e.onchange = function () { p.party[+e.getAttribute("data-p")] = e.value; };
    });
    b.querySelectorAll("#tpMode [data-m]").forEach(function (x) {
      x.onclick = function () {
        p.mode = x.getAttribute("data-m");
        if (p.mode === "none") { p.lv = 1; p.hpP = 100; p.atkP = 100; p.spdP = 100; }
        if (p.mode === "lv50") { p.lv = 50; p.hpP = 100; p.atkP = 100; p.spdP = 100; }
        if (p.mode === "lv100") { p.lv = 100; p.hpP = 100; p.atkP = 100; p.spdP = 100; }
        if (p.mode === "max") { p.lv = 120; p.hpP = 100; p.atkP = 100; p.spdP = 100; }
        if (p.mode === "atk") { p.lv = 1; p.hpP = 100; p.atkP = 100; p.spdP = 100; p.atkMax = 1; }
        M.render();
      };
    });
    b.querySelectorAll("[data-t]").forEach(function (e) {
      e.oninput = e.onchange = function () { p[e.getAttribute("data-t")] = num(e.value, 0); p.mode = "free"; };
    });
    b.querySelectorAll("#tpW [data-w]").forEach(function (x) {
      x.onclick = function () { V.testWave = +x.getAttribute("data-w"); p.startWave = V.testWave; M.render(); };
    });
    el("tpPoint").onchange = function () { p.point = el("tpPoint").value; };
    el("tpMine").onclick = function () { p.party = defaultParty(); M.render(); };
    el("tpAuto").onclick = function () {
      var g = gameChars();
      p.party = g.slice(-4).map(function (x) { return x.k; });
      M.render();
    };
    el("tpNm").oninput = function () { p.nm = el("tpNm").value; };
    el("tpSave").onclick = function () {
      var c = JSON.parse(JSON.stringify(p)); c.id = uid("p"); c.startWave = V.testWave;
      S.presets.push(c); save(1); M.render(); toast("プリセットを保存しました");
    };
    b.querySelectorAll("[data-pl]").forEach(function (x) {
      x.onclick = function () {
        var id = x.getAttribute("data-pl");
        var f = S.presets.filter(function (z) { return z.id === id; })[0];
        if (!f) return;
        V.preset = JSON.parse(JSON.stringify(f));
        V.testWave = clamp(f.startWave | 0 || 1, 1, 6);
        M.render(); toast("読みこみました");
      };
    });
    b.querySelectorAll("[data-pd]").forEach(function (x) {
      x.onclick = function (ev) {
        ev.stopPropagation();
        var id = x.getAttribute("data-pd");
        S.presets = S.presets.filter(function (z) { return z.id !== id; });
        save(1); M.render();
      };
    });
    el("tpGo").onclick = function () { startTest(q, p); };
  };

  /* ══════════════════════════════════════════════════════════
     テストプレイの開始
     ══════════════════════════════════════════════════════════ */
  function startTest(q, p) {
    var db = GDB();
    if (typeof window.startBattleNow !== "function" || !db) {
      toast("MagiBurst のバトルが読みこめていません"); return;
    }
    var st = M.toStage(q, { id: "mbctest" });
    window.MBC_STAGES = window.MBC_STAGES || {};
    MBC_STAGES[st.id] = st;

    /* ① いまの編成とスタミナのしくみを退避 */
    TP = {
      party: (db.party || []).slice(),
      partyIdx: db.partyIdx | 0,
      paySt: window.payStamina,
      wave: clamp((p.startWave | 0 || V.testWave || 1), 1, clamp(q.waveN | 0, 1, 6)),
      point: p.point || "start",
      quest: q.id, preset: JSON.parse(JSON.stringify(p)),
    };
    /* ② テスト中はスタミナを取らない */
    try { window.payStamina = function () { return true; }; } catch (e) {}
    /* ③ 編成を差しかえる（オリジナルキャラは本物のキャラに読みかえる） */
    var C = GCHARS();
    var party = (p.party || []).filter(Boolean).map(function (id) {
      if (String(id).indexOf("mbc:") === 0) {
        /* まだゲームに無いキャラは、いちばん近い属性の本物のキャラで代用する */
        var c = S.chars.filter(function (z) { return "mbc:" + z.id === id; })[0];
        var pick = GIDS().filter(function (x) { return C && C[x] && C[x].el === (c && c.el); });
        return pick.length ? pick[pick.length - 1] : (db.party && db.party[0]);
      }
      return id;
    }).filter(function (x) { return x && C && C[x]; });
    if (!party.length) party = defaultParty();
    db.party = party.slice(0, 4);

    /* ④ エディタを閉じてバトルへ */
    M.close();
    try {
      window.startBattleNow(st.id, false);
    } catch (e) {
      toast("テストを開始できませんでした"); restore(); return;
    }
    /* ⑤ 開始 WAVE とテストポイント */
    setTimeout(function () {
      try {
        if (TP.wave > 1 && typeof window.spawnWave === "function") spawnWave(TP.wave - 1, true);
        applyTrain(p);
        if (TP.point === "t3") fastTurns(3);
        if (TP.point === "t5") fastTurns(5);
        paintDebug(); showDebug(true);
      } catch (e) {}
    }, 420);
  }

  /* 育成状態を ball.st に上書きする */
  function applyTrain(p) {
    var B = GB();
    if (!B || !B.balls) return;
    var lvR = clamp((p.lv | 0 || 80) / 80, 0.1, 1.8);
    B.balls.forEach(function (b) {
      if (!b || !b.st) return;
      var base = b.st;
      if (p.mode === "none") { base.hp = Math.round(base.hp * 0.32); base.atk = Math.round(base.atk * 0.30); }
      else if (p.mode === "max") { /* そのまま（育成MAX） */ }
      else if (p.mode === "atk") { base.hp = Math.round(base.hp * 0.32); }
      else if (p.mode !== "free") { base.hp = Math.round(base.hp * lvR); base.atk = Math.round(base.atk * lvR); }
      base.hp = Math.max(1, Math.round(base.hp * (p.hpP | 0 || 100) / 100));
      base.atk = Math.max(1, Math.round(base.atk * (p.atkP | 0 || 100) / 100));
      base.spd = Math.max(1, Math.round(base.spd * (p.spdP | 0 || 100) / 100));
      if (!p.abil) b.ch = Object.assign({}, b.ch, { abil: [] });
    });
    try {
      B.maxhp = B.balls.reduce(function (a, b) { return a + (b.st ? b.st.hp : 0); }, 0);
      B.hp = B.maxhp;
      if (typeof paintHp === "function") paintHp();
      if (typeof paintParty === "function") paintParty();
    } catch (e) {}
  }
  /* ◯ターンぶん進めた状態にする（敵の行動ターンだけ進める＝安全に「経過後」を作る） */
  function fastTurns(n) {
    var B = GB();
    if (!B) return;
    B.waveTurns = (B.waveTurns | 0) + n;
    (B.enemies || []).forEach(function (e) { e.act = Math.max(1, (e.act | 0) - n); });
    toast(n + "ターン経過した状態から始めます");
  }

  function restore() {
    if (!TP) return;
    try { var db = GDB(); if (db) { db.party = TP.party; db.partyIdx = TP.partyIdx; } } catch (e) {}
    try { if (TP.paySt) window.payStamina = TP.paySt; } catch (e) {}
    TP = null;
    showDebug(false);
  }
  M._restoreTest = restore;

  /* ══════════════════════════════════════════════════════════
     デバッグメニュー
     ══════════════════════════════════════════════════════════ */
  function showDebug(on) {
    var d = el("mbcDebug"), f = el("mbcDbgFab");
    if (d) d.classList.toggle("on", !!on);
    if (f) f.classList.toggle("on", !!on);
    if (on) {
      clearInterval(showDebug._iv);
      showDebug._iv = setInterval(paintDebug, 400);
    } else {
      clearInterval(showDebug._iv);
    }
  }
  function paintDebug() {
    var d = el("mbcDebug"); if (!d || !d.classList.contains("on")) return;
    var B = GB();
    if (!B || !B.balls) { d.innerHTML = '<div class="dh">DEBUG</div><div>バトル中ではありません</div>'; return; }
    var boss = (B.enemies || []).filter(function (e) { return e.boss && e.hp > 0; })[0]
             || (B.enemies || []).filter(function (e) { return e.hp > 0; })[0];
    var nextAtk = (B.enemies || []).filter(function (e) { return e.hp > 0; })
      .reduce(function (a, e) { return Math.min(a, e.act | 0); }, 99);
    var ball = B.balls[B.turn | 0];
    var wv = (B.wave | 0) + 1;
    var q = curQ();
    var evN = q && q.waves[(B.wave | 0)] ? (q.waves[B.wave | 0].events || []).length : 0;
    d.innerHTML =
      '<div class="dh">🐞 デバッグメニュー<button onclick="document.getElementById(\'mbcDebug\').classList.remove(\'on\')">✕</button></div>' +
      "<dl>" +
      "<dt>現在WAVE</dt><dd>" + wv + " / " + ((B.stage && B.stage.waves ? B.stage.waves.length : 1)) + "</dd>" +
      "<dt>現在ターン</dt><dd>" + (B.waveTurns | 0) + "</dd>" +
      "<dt>敵HP</dt><dd>" + (boss ? Math.round(boss.hp).toLocaleString() : "—") + "</dd>" +
      "<dt>プレイヤーHP</dt><dd>" + Math.round(B.hp || 0).toLocaleString() + " / " + Math.round(B.maxhp || 0).toLocaleString() + "</dd>" +
      "<dt>攻撃力</dt><dd>" + (ball && ball.st ? Math.round(ball.st.atk).toLocaleString() : "—") + "</dd>" +
      "<dt>ギミック</dt><dd>" + Object.keys((B.stage && B.stage.gim) || {}).join(",") + "</dd>" +
      "<dt>イベント</dt><dd>" + evN + " 件</dd>" +
      "<dt>敵AI</dt><dd>" + ((B.enemies || []).filter(function (e) { return e.hp > 0; }).length) + " 体 稼働</dd>" +
      "<dt>次の敵攻撃</dt><dd>" + (nextAtk >= 99 ? "—" : nextAtk + " ターン後") + "</dd>" +
      "<dt>残りターン</dt><dd>" + (B.turn != null ? (B.balls.length - (B.turn | 0)) : "—") + "</dd>" +
      "</dl>" +
      '<div class="db">' +
      '<button id="dbNext">次のターン</button>' +
      '<button id="dbSkip">WAVEをスキップ</button>' +
      '<button id="dbRe">リスタート</button>' +
      '<button class="dan" id="dbBack">編集画面へ戻る</button>' +
      "</div>";
    el("dbNext").onclick = function () {
      try {
        var B = GB(); if (!B) return;
        (B.enemies || []).forEach(function (e) { e.act = Math.max(1, (e.act | 0) - 1); });
        B.waveTurns = (B.waveTurns | 0) + 1;
        if (typeof endShot === "function") endShot();
        else if (typeof nextTurn === "function") nextTurn();
      } catch (e) {}
      paintDebug();
    };
    el("dbSkip").onclick = function () {
      try {
        var B = GB(); if (!B) return;
        (B.enemies || []).forEach(function (e) { e.hp = 0; e.dead = true; });
        toast("この WAVE の敵を全滅させました");
      } catch (e) {}
    };
    el("dbRe").onclick = function () {
      var q2 = curQ(), p2 = TP && TP.preset;
      if (!q2 || !p2) return;
      restore();
      setTimeout(function () { startTest(q2, p2); }, 120);
    };
    el("dbBack").onclick = function () {
      restore();
      try { var B2 = GB(); if (B2) B2.over = true; } catch (e) {}
      try { if (typeof goTab === "function") goTab("vhome"); } catch (e) {}
      setTimeout(function () { M.open("stage"); }, 200);
    };
  }
  M._paintDebug = paintDebug;
  M._showDebug = showDebug;
})();
