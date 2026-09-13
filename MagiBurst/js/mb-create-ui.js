/* ══════════════════════════════════════════════════════════════
   mb-create-ui.js — クエスト作成の「画面」（mb-create.js の続き）
   ------------------------------------------------------------
   ★ 2つに分けてあるのは<b>1本が長くなりすぎる</b>から。
     データ・保存・変換・エクスポートは mb-create.js、
     画面（ホーム／一覧／編集／ステージエディタ／各エディタ／テストプレイ）はこちら。
   ★ mb-create.js が先に読まれていること（window.MBCreate が要る）。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var M = window.MBCreate;
  if (!M || M._uiDone) return;
  M._uiDone = 1;

  var U = M._u, T = M._tables, V = M._V, S = M._S;
  var el = U.el, esc = U.esc, uid = U.uid, clamp = U.clamp, num = U.num;
  var toast = U.toast, ask = U.ask, openSheet = U.openSheet, closeSheet = U.closeSheet;
  var setTitle = U.setTitle, objDef = U.objDef, elc = U.elc, eln = U.eln;
  var W = U.W, H = U.H;
  var save = M._save, curQ = M._curQ, curW = M._curW, go = M.go, render = M.render;

  function opts(list, cur, kk, nk) {
    kk = kk || "k"; nk = nk || "nm";
    return list.map(function (x) {
      var k = (typeof x === "object") ? x[kk] : x, n = (typeof x === "object") ? x[nk] : x;
      return '<option value="' + esc(k) + '"' + (String(k) === String(cur) ? " selected" : "") + ">" + esc(n) + "</option>";
    }).join("");
  }
  function row(label, inner) {
    return '<div class="mbc-row"><label>' + esc(label) + "</label>" + inner + "</div>";
  }
  function rowW(label, inner) {
    return '<div class="mbc-row wide col"><label>' + esc(label) + "</label>" + inner + "</div>";
  }

  /* ══════════════════════════════════════════════════════════
     ① ホーム
     ══════════════════════════════════════════════════════════ */
  M.renderHomeImpl = function (b) {
    setTitle("ステージエディター", "あなただけのオリジナルクエストを作ろう");
    var recent = S.quests.slice().sort(function (a, c) { return String(c.at).localeCompare(String(a.at)); }).slice(0, 5);
    b.innerHTML =
      '<div class="mbc-hero"><b>ステージエディター</b>' +
        "<small>クエスト作成 → テストプレイ → 調整 を、この中だけでまわせます</small></div>" +
      '<div class="mbc-home">' +
        '<button data-a="new"><i>＋</i><span><b>クエストを作る</b><small>新しいオリジナルクエストを作ります</small></span></button>' +
        '<button data-a="list"><i>📋</i><span><b>クエスト一覧</b><small>' + S.quests.length + " 件</small></span></button>" +
        '<button data-a="chars"><i>🧑</i><span><b>キャラクター管理</b><small>' + S.chars.length + " 体のオリジナルキャラ</small></span></button>" +
        '<button data-a="gallery"><i>🖼</i><span><b>素材・ギャラリー</b><small>敵やキャラの画像を登録する</small></span></button>' +
      "</div>" +
      (recent.length ? '<div class="mbc-panel" style="margin-top:12px"><h3>最近の編集</h3><div class="mbc-list">' +
        recent.map(function (q) {
          return '<div class="mbc-item" data-open="' + q.id + '">' +
            '<span class="ic">' + (q.fav ? "★" : "🗺") + "</span>" +
            '<span class="tx"><b>' + esc(q.nm) + "</b><small>" + esc(q.at) + " ・ " +
            clamp(q.waveN | 0, 1, 6) + "WAVE ・ 難易度 " + (q.diff | 0) + "</small></span>" +
            '<span class="act"><button>›</button></span></div>';
        }).join("") + "</div></div>" : "") +
      '<div class="mbc-panel"><h3>つかいかた</h3><div class="mbc-note">' +
        "① <b>クエストを作る</b>で名前と WAVE 数を決める<br>" +
        "② <b>ステージエディタ</b>で敵や壁をドラッグして置く（タップで細かい設定）<br>" +
        "③ 敵の<b>ステータス・行動パターン・攻撃</b>を決める<br>" +
        "④ <b>ギミック</b>と<b>イベント（IF→THEN）</b>を足す<br>" +
        "⑤ <b>TEST PLAY</b> で、好きなキャラ・好きな育成状態・好きな WAVE から試す<br>" +
        "⑥ <b>エクスポート</b>すると端末の「ダウンロード」に .json と .js が保存されます。" +
        "Claude には<b>「Downloads の ◯◯.json を使って」</b>と言えばそのまま渡せます。" +
      "</div></div>";
    b.querySelectorAll("[data-a]").forEach(function (x) {
      x.onclick = function () {
        var a = x.getAttribute("data-a");
        if (a === "new") return createQuest();
        go(a);
      };
    });
    b.querySelectorAll("[data-open]").forEach(function (x) {
      x.onclick = function () { V.qid = x.getAttribute("data-open"); V.wave = 0; go("edit"); };
    });
  };

  function createQuest() {
    var q = M._newQuest();
    S.quests.unshift(q); save();
    V.qid = q.id; V.wave = 0; go("edit");
    toast("新しいクエストを作りました");
  }

  /* ══════════════════════════════════════════════════════════
     ② クエスト一覧
     ══════════════════════════════════════════════════════════ */
  M.renderListImpl = function (b) {
    setTitle("クエスト一覧", S.quests.length + " 件");
    var list = S.quests.slice().sort(function (a, c) { return (c.fav | 0) - (a.fav | 0) || String(c.at).localeCompare(String(a.at)); });
    b.innerHTML =
      '<div class="mbc-btns" style="margin:0 0 10px">' +
        '<button class="mbc-btn pri" id="qNew">＋ 新規作成</button>' +
        '<button class="mbc-btn" id="qImport">⬆ 読み込み（JSON）</button>' +
      "</div>" +
      '<div class="mbc-list">' + (list.length ? list.map(function (q) {
        return '<div class="mbc-item"><span class="ic">' + (q.fav ? "★" : "🗺") + "</span>" +
          '<span class="tx" data-open="' + q.id + '"><b>' + esc(q.nm) + "</b><small>" +
          "難易度 " + (q.diff | 0) + " ・ " + clamp(q.waveN | 0, 1, 6) + "WAVE ・ " + esc(q.at) + "</small></span>" +
          '<span class="act">' +
            '<button data-fav="' + q.id + '" class="' + (q.fav ? "fav" : "") + '" title="お気に入り">★</button>' +
            '<button data-copy="' + q.id + '" title="複製">⧉</button>' +
            '<button data-exp="' + q.id + '" title="エクスポート">⬇</button>' +
            '<button data-del="' + q.id + '" class="dan" title="削除">🗑</button>' +
          "</span></div>";
      }).join("") : '<div class="mbc-note">まだクエストがありません。「＋ 新規作成」から作れます。</div>') + "</div>";
    el("qNew").onclick = createQuest;
    el("qImport").onclick = importQuest;
    b.querySelectorAll("[data-open]").forEach(function (x) {
      x.onclick = function () { V.qid = x.getAttribute("data-open"); V.wave = 0; go("edit"); };
    });
    b.querySelectorAll("[data-fav]").forEach(function (x) {
      x.onclick = function () {
        var q = find(x.getAttribute("data-fav")); if (!q) return;
        q.fav = q.fav ? 0 : 1; save(); render();
      };
    });
    b.querySelectorAll("[data-copy]").forEach(function (x) {
      x.onclick = function () {
        var q = find(x.getAttribute("data-copy")); if (!q) return;
        var c = JSON.parse(JSON.stringify(q));
        c.id = uid("q"); c.nm = q.nm + " のコピー"; c.at = U.nowText(); c.fav = 0;
        S.quests.unshift(c); save(); render(); toast("複製しました");
      };
    });
    b.querySelectorAll("[data-exp]").forEach(function (x) {
      x.onclick = function () { var q = find(x.getAttribute("data-exp")); if (q) openExport(q); };
    });
    b.querySelectorAll("[data-del]").forEach(function (x) {
      x.onclick = function () {
        var q = find(x.getAttribute("data-del")); if (!q) return;
        ask("<b>" + esc(q.nm) + "</b> を削除します。もとに戻せません。", "削除する").then(function (ok) {
          if (!ok) return;
          S.quests = S.quests.filter(function (z) { return z.id !== q.id; });
          save(); render(); toast("削除しました");
        });
      };
    });
  };
  function find(id) { for (var i = 0; i < S.quests.length; i++) if (S.quests[i].id === id) return S.quests[i]; return null; }

  function importQuest() {
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".json,application/json";
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var d = JSON.parse(fr.result);
          var q = d && d.quest ? d.quest : d;
          if (!q || !q.waves) throw 0;
          q.id = uid("q"); q.at = U.nowText();
          S.quests.unshift(q);
          if (d && Array.isArray(d.chars)) d.chars.forEach(function (c) { S.chars.push(c); });
          save(); render(); toast("読み込みました");
        } catch (e) { toast("この JSON は読めませんでした"); }
      };
      fr.readAsText(f);
    };
    inp.click();
  }

  /* ══════════════════════════════════════════════════════════
     ③ クエスト編集（基本設定）
     ══════════════════════════════════════════════════════════ */
  M.renderEditImpl = function (b) {
    var q = curQ(); if (!q) { go("list"); return; }
    setTitle(q.nm, "クエスト基本設定");
    b.innerHTML =
      '<div class="mbc-panel"><h3>クエスト基本設定<span>' + esc(q.at) + "</span></h3>" +
        rowW("クエスト名", '<input class="mbc-in" id="fNm" value="' + esc(q.nm) + '">') +
        rowW("説明", '<textarea class="mbc-ta" id="fDesc">' + esc(q.desc) + "</textarea>") +
        '<div class="mbc-grid2">' +
          row("難易度", '<input class="mbc-in num" id="fDiff" type="number" min="1" max="10" value="' + (q.diff | 0) + '">') +
          row("スタミナ", '<input class="mbc-in num" id="fStam" type="number" min="0" max="99" value="' + (q.stamina | 0) + '">') +
          row("制限時間", '<input class="mbc-in num" id="fTime" type="number" min="0" max="999" value="' + (q.timeLimit | 0) + '">') +
          row("最大WAVE", '<select class="mbc-sel" id="fWn">' + opts([1, 2, 3, 4, 5, 6], q.waveN) + "</select>") +
          row("BGM", '<select class="mbc-sel" id="fBgm">' + opts(T.BGMS, q.bgm) + "</select>") +
          row("背景", '<select class="mbc-sel" id="fBg">' + opts(T.BGS, q.bg) + "</select>") +
        "</div>" +
        rowW("クリア条件", '<input class="mbc-in" id="fClear" value="' + esc(q.clear) + '">') +
        rowW("敗北条件", '<input class="mbc-in" id="fLose" value="' + esc(q.lose) + '">') +
      "</div>" +
      '<div class="mbc-panel"><h3>WAVE<span>タップして編集</span></h3>' +
        '<div class="mbc-waves" id="wTabs">' + waveTabs(q) + "</div>" +
        '<div class="mbc-note" id="wInfo"></div>' +
        '<div class="mbc-btns"><button class="mbc-btn pri" id="goStage">🗺 ステージエディタ</button>' +
        '<button class="mbc-btn" id="wCopy">⧉ WAVEをコピー</button></div>' +
      "</div>" +
      '<div class="mbc-panel"><h3>テストと書き出し</h3>' +
        '<div class="mbc-btns"><button class="mbc-btn go" id="goTest">▶ TEST PLAY</button>' +
        '<button class="mbc-btn" id="goExp">⬇ エクスポート</button></div>' +
        '<div class="mbc-note" style="margin-top:8px">エクスポートすると端末の<b>ダウンロード</b>に ' +
        "<b>.json</b>（読み込み用）と <b>.js</b>（mb-core.js に貼れるコード）が保存されます。</div>" +
      "</div>";

    bind("fNm", "nm", "s"); bind("fDesc", "desc", "s"); bind("fDiff", "diff", "n");
    bind("fStam", "stamina", "n"); bind("fTime", "timeLimit", "n"); bind("fWn", "waveN", "n");
    bind("fBgm", "bgm", "s"); bind("fBg", "bg", "n");
    bind("fClear", "clear", "s"); bind("fLose", "lose", "s");
    function bind(id, key, t) {
      var e = el(id); if (!e) return;
      e.oninput = e.onchange = function () {
        q[key] = t === "n" ? num(e.value, 0) : e.value;
        q.at = U.nowText(); save();
        if (key === "nm") setTitle(q.nm, "クエスト基本設定");
        if (key === "waveN") { el("wTabs").innerHTML = waveTabs(q); wireTabs(); }
      };
    }
    wireTabs();
    function wireTabs() {
      b.querySelectorAll("#wTabs button").forEach(function (x) {
        x.onclick = function () { V.wave = +x.getAttribute("data-w"); wireTabs(); showInfo(); render0(); };
      });
      b.querySelectorAll("#wTabs button").forEach(function (x) {
        x.classList.toggle("on", +x.getAttribute("data-w") === V.wave);
      });
      showInfo();
    }
    function render0() {}
    function showInfo() {
      var wv = q.waves[V.wave] || {};
      var en = (wv.objs || []).filter(function (o) { return o.kind === "enemy" || o.kind === "boss"; }).length;
      var endNm = (T.ENDS.filter(function (z) { return z.k === (wv.end && wv.end.k); })[0] || {}).nm || "敵を全滅";
      el("wInfo").innerHTML = "WAVE " + (V.wave + 1) + " ／ 敵 <b>" + en + "</b>体 ・ オブジェクト <b>" +
        ((wv.objs || []).length) + "</b>個 ・ ギミック <b>" + ((wv.gims || []).length) +
        "</b>種 ・ イベント <b>" + ((wv.events || []).length) + "</b>件<br>終了条件: <b>" + esc(endNm) + "</b>";
    }
    el("goStage").onclick = function () { go("stage"); };
    el("goTest").onclick = function () { go("test"); };
    el("goExp").onclick = function () { openExport(q); };
    el("wCopy").onclick = function () { openWaveCopy(q); };
  };
  function waveTabs(q) {
    var n = clamp(q.waveN | 0, 1, 6), s = "";
    for (var i = 0; i < 6; i++) {
      s += '<button data-w="' + i + '" class="' + (i === V.wave ? "on" : "") + (i >= n ? " off" : "") + '">WAVE ' + (i + 1) + "</button>";
    }
    return s;
  }

  function openWaveCopy(q) {
    openSheet('<div class="mbc-sheet-hd"><b>WAVE をコピー</b>' +
      '<button class="mbc-ico" onclick="MBCreate._u.closeSheet()">✕</button></div>' +
      '<div class="mbc-grid2">' +
      row("コピー元", '<select class="mbc-sel" id="wcFrom">' + opts([1, 2, 3, 4, 5, 6].map(function (n) { return { k: n - 1, nm: "WAVE " + n }; }), V.wave) + "</select>") +
      row("貼り先", '<select class="mbc-sel" id="wcTo">' + opts([1, 2, 3, 4, 5, 6].map(function (n) { return { k: n - 1, nm: "WAVE " + n }; }), V.wave) + "</select>") +
      "</div>" +
      '<div class="mbc-btns"><button class="mbc-btn" onclick="MBCreate._u.closeSheet()">やめる</button>' +
      '<button class="mbc-btn pri" id="wcGo">コピーする</button></div>');
    el("wcGo").onclick = function () {
      var a = +el("wcFrom").value, c = +el("wcTo").value;
      if (a === c) { toast("同じ WAVE です"); return; }
      var src = JSON.parse(JSON.stringify(q.waves[a]));
      src.n = c + 1;
      (src.objs || []).forEach(function (o) { o.oid = uid("o"); });
      q.waves[c] = src; q.at = U.nowText(); save(); closeSheet(); render();
      toast("WAVE " + (a + 1) + " を WAVE " + (c + 1) + " へコピーしました");
    };
  }

  /* ══════════════════════════════════════════════════════════
     ④ ステージエディタ
     ══════════════════════════════════════════════════════════ */
  M.renderStageImpl = function (b) {
    var q = curQ(); if (!q) { go("list"); return; }
    setTitle(q.nm, "ステージエディタ（WAVE " + (V.wave + 1) + "）");
    b.innerHTML =
      '<div class="mbc-waves" id="sTabs">' + waveTabs(q) + "</div>" +
      '<div class="mbc-pal" id="sPal">' + T.OBJS.map(function (o) {
        return '<button data-t="' + o.k + '" class="' + (V.tool === o.k ? "on" : "") + '"><i>' + o.ic + "</i>" + esc(o.nm) + "</button>";
      }).join("") + "</div>" +
      '<div class="mbc-stage" id="sStage"><div class="grid"></div>' +
        '<div class="mbc-hint" id="sHint">パレットで種類をえらんで<b>盤面をタップ</b>すると置けます。置いたものは<b>ドラッグ</b>で動かせます。</div></div>' +
      '<div class="mbc-btns" style="margin-top:9px">' +
        '<button class="mbc-btn" id="sEdit">✎ 選択中を設定</button>' +
        '<button class="mbc-btn dan" id="sDel">🗑 削除</button>' +
        '<button class="mbc-btn" id="sDup">⧉ 複製</button>' +
      "</div>" +
      '<div class="mbc-panel" style="margin-top:10px"><h3>レイヤー</h3><div class="mbc-layers" id="sLayers"></div></div>' +
      '<div class="mbc-panel"><h3>この WAVE</h3>' +
        '<div class="mbc-btns"><button class="mbc-btn" id="sGim">⚙ ギミック</button>' +
        '<button class="mbc-btn" id="sEv">🔀 イベント</button>' +
        '<button class="mbc-btn" id="sEnd">🏁 WAVE遷移</button></div>' +
      "</div>" +
      '<div class="mbc-btns"><button class="mbc-btn go full" id="sTest">▶ この WAVE からテスト</button></div>';

    b.querySelectorAll("#sTabs button").forEach(function (x) {
      x.onclick = function () { V.wave = +x.getAttribute("data-w"); V.sel = null; render(); };
    });
    b.querySelectorAll("#sPal button").forEach(function (x) {
      x.onclick = function () {
        V.tool = x.getAttribute("data-t");
        b.querySelectorAll("#sPal button").forEach(function (y) { y.classList.toggle("on", y === x); });
      };
    });
    drawStage();
    drawLayers();
    el("sEdit").onclick = function () { var o = selObj(); if (o) openObjSheet(o); else toast("先にオブジェクトをえらんでください"); };
    el("sDel").onclick = function () {
      var o = selObj(); if (!o) { toast("先にオブジェクトをえらんでください"); return; }
      var wv = curW(); wv.objs = wv.objs.filter(function (z) { return z.oid !== o.oid; });
      V.sel = null; q.at = U.nowText(); save(); drawStage();
    };
    el("sDup").onclick = function () {
      var o = selObj(); if (!o) { toast("先にオブジェクトをえらんでください"); return; }
      var c = JSON.parse(JSON.stringify(o)); c.oid = uid("o");
      c.x = clamp(c.x + 0.06, 0.04, 0.96); c.y = clamp(c.y + 0.05, 0.04, 0.94);
      curW().objs.push(c); V.sel = c.oid; q.at = U.nowText(); save(); drawStage();
    };
    el("sGim").onclick = openGimSheet;
    el("sEv").onclick = openEventSheet;
    el("sEnd").onclick = openEndSheet;
    el("sTest").onclick = function () { V.testWave = V.wave + 1; go("test"); };
  };
  function selObj() {
    var wv = curW(); if (!wv) return null;
    for (var i = 0; i < (wv.objs || []).length; i++) if (wv.objs[i].oid === V.sel) return wv.objs[i];
    return null;
  }
  function layerOf(kind) {
    if (kind === "boss") return "boss";
    if (kind === "enemy") return "enemy";
    if (kind === "spawn") return "player";
    if (kind === "fx") return "fx";
    if (kind === "gimmick" || kind === "switch" || kind === "trigger" || kind === "spawner") return "gim";
    return "stage";
  }
  function drawStage() {
    var st = el("sStage"); if (!st) return;
    var wv = curW(); if (!wv) return;
    st.querySelectorAll(".mbc-obj").forEach(function (x) { x.remove(); });
    (wv.objs || []).forEach(function (o, i) {
      var ly = layerOf(o.kind);
      if (!V.layers[ly]) return;
      var d = objDef(o.kind);
      var sc = (o.size || 100) / 100;
      var e = document.createElement("div");
      e.className = "mbc-obj" + (d.round ? " round" : "") + (o.oid === V.sel ? " sel" : "");
      e.style.left = (o.x * 100) + "%";
      e.style.top = (o.y * 100) + "%";
      e.style.width = ((o.w * sc) / W * 100) + "%";
      e.style.height = ((o.h * sc) / H * 100) + "%";
      e.style.transform = "translate(-50%,-50%) rotate(" + (o.rot || 0) + "deg)";
      e.style.background = (o.kind === "enemy" || o.kind === "boss") ? elc(o.el) : d.c;
      e.style.opacity = V.locks[ly] ? ".6" : "1";
      e.innerHTML = o.img ? '<img src="' + esc(o.img) + '" alt="">' :
        "<span>" + d.ic + "</span>" + (o.kind === "enemy" || o.kind === "boss" ? "<small>" + esc(o.nm || "") + "</small>" : "");
      e.setAttribute("data-oid", o.oid);
      st.appendChild(e);
      if (V.locks[ly]) return;
      dragify(e, o, st);
    });
    st.onclick = function (ev) {
      if (ev.target !== st && !ev.target.classList.contains("grid")) return;
      var r = st.getBoundingClientRect();
      var x = clamp((ev.clientX - r.left) / r.width, 0.04, 0.96);
      var y = clamp((ev.clientY - r.top) / r.height, 0.04, 0.96);
      var o = M._newObject(V.tool, x, y);
      curW().objs.push(o); V.sel = o.oid;
      curQ().at = U.nowText(); save(); drawStage();
    };
  }
  function dragify(e, o, st) {
    var moved = false, sx = 0, sy = 0;
    function down(ev) {
      ev.preventDefault(); ev.stopPropagation();
      moved = false;
      var p = ev.touches ? ev.touches[0] : ev;
      sx = p.clientX; sy = p.clientY;
      V.sel = o.oid;
      st.querySelectorAll(".mbc-obj").forEach(function (x) { x.classList.toggle("sel", x === e); });
      document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
      document.addEventListener("touchmove", move, { passive: false }); document.addEventListener("touchend", up);
    }
    function move(ev) {
      ev.preventDefault();
      var p = ev.touches ? ev.touches[0] : ev;
      if (Math.abs(p.clientX - sx) + Math.abs(p.clientY - sy) > 4) moved = true;
      var r = st.getBoundingClientRect();
      o.x = clamp((p.clientX - r.left) / r.width, 0.02, 0.98);
      o.y = clamp((p.clientY - r.top) / r.height, 0.02, 0.98);
      e.style.left = (o.x * 100) + "%"; e.style.top = (o.y * 100) + "%";
    }
    function up() {
      document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up);
      document.removeEventListener("touchmove", move); document.removeEventListener("touchend", up);
      curQ().at = U.nowText(); save();
      if (!moved) openObjSheet(o);
    }
    e.addEventListener("mousedown", down);
    e.addEventListener("touchstart", down, { passive: false });
  }
  function drawLayers() {
    var LY = [["bg", "背景"], ["stage", "ステージ"], ["gim", "ギミック"], ["enemy", "敵"],
              ["boss", "ボス"], ["player", "プレイヤー"], ["fx", "エフェクト"]];
    var box = el("sLayers"); if (!box) return;
    box.innerHTML = LY.map(function (p) {
      return '<div class="ly"><span class="nm">' + esc(p[1]) + "</span>" +
        '<button data-v="' + p[0] + '" class="' + (V.layers[p[0]] ? "" : "off") + '" title="表示">👁</button>' +
        '<button data-l="' + p[0] + '" class="' + (V.locks[p[0]] ? "" : "off") + '" title="ロック">🔒</button>' +
        "</div>";
    }).join("");
    box.querySelectorAll("[data-v]").forEach(function (x) {
      x.onclick = function () { var k = x.getAttribute("data-v"); V.layers[k] = !V.layers[k]; drawLayers(); drawStage(); };
    });
    box.querySelectorAll("[data-l]").forEach(function (x) {
      x.onclick = function () { var k = x.getAttribute("data-l"); V.locks[k] = !V.locks[k]; drawLayers(); drawStage(); };
    });
  }

  /* ══════════════════════════════════════════════════════════
     ⑤ オブジェクト設定（敵は⑥⑦の入口も出す）
     ══════════════════════════════════════════════════════════ */
  function openObjSheet(o) {
    var isEnemy = (o.kind === "enemy" || o.kind === "boss");
    var d = objDef(o.kind);
    var h = '<div class="mbc-sheet-hd"><b>' + d.ic + " " + esc(d.nm) + "</b>" +
      '<button class="mbc-ico" onclick="MBCreate._u.closeSheet()">✕</button></div>';
    h += '<div class="mbc-grid2">' +
      row("X座標", '<input class="mbc-in num" data-f="x" type="number" step="1" value="' + Math.round(o.x * W) + '">') +
      row("Y座標", '<input class="mbc-in num" data-f="y" type="number" step="1" value="' + Math.round(o.y * H) + '">') +
      row("幅", '<input class="mbc-in num" data-f="w" type="number" value="' + (o.w | 0) + '">') +
      row("高さ", '<input class="mbc-in num" data-f="h" type="number" value="' + (o.h | 0) + '">') +
      row("回転", '<input class="mbc-in num" data-f="rot" type="number" value="' + (o.rot | 0) + '">') +
      row("サイズ", '<input class="mbc-in num" data-f="size" type="number" value="' + (o.size | 0) + '">') +
      "</div>";
    if (isEnemy) {
      h += '<div class="mbc-panel"><h3>基本</h3>' +
        rowW("名前", '<input class="mbc-in" data-f="nm" value="' + esc(o.nm) + '">') +
        '<div class="mbc-grid2">' +
          row("属性", '<select class="mbc-sel" data-f="el">' + opts(T.ELS, o.el) + "</select>") +
          row("見た目", '<select class="mbc-sel" data-f="sp">' + opts(T.SPS, o.sp) + "</select>") +
          row("種族", '<select class="mbc-sel" data-f="race">' + opts(T.RACES, o.race) + "</select>") +
          row("行動ターン", '<input class="mbc-in num" data-f="cd" type="number" min="1" max="9" value="' + (o.cd | 0) + '">') +
          row("HP", '<input class="mbc-in num" data-f="hp" type="number" value="' + (o.hp | 0) + '">') +
          row("攻撃力", '<input class="mbc-in num" data-f="atk" type="number" value="' + (o.atk | 0) + '">') +
          row("防御力", '<input class="mbc-in num" data-f="def" type="number" value="' + (o.def | 0) + '">') +
          row("速度", '<input class="mbc-in num" data-f="spd" type="number" value="' + (o.spd | 0) + '">') +
          row("当たり半径", '<input class="mbc-in num" data-f="r" type="number" value="' + (o.r | 0) + '">') +
          row("重量", '<input class="mbc-in num" data-f="weight" type="number" value="' + (o.weight | 0) + '">') +
        "</div>" +
        '<div class="mbc-grid2">' +
          row("ボス", '<select class="mbc-sel" data-f="boss">' + opts([{ k: 0, nm: "いいえ" }, { k: 1, nm: "はい" }], o.boss) + "</select>") +
          row("弱点", '<select class="mbc-sel" data-f="weak">' + opts([{ k: 0, nm: "なし" }, { k: 1, nm: "あり" }], o.weak) + "</select>") +
          row("弱点倍率", '<input class="mbc-in num" data-f="weakMul" type="number" step="0.1" value="' + o.weakMul + '">') +
          row("弱点の位置", '<select class="mbc-sel" data-f="wside">' + opts([
            { k: "", nm: "自動" }, { k: "top", nm: "上" }, { k: "bottom", nm: "下" },
            { k: "left", nm: "左" }, { k: "right", nm: "右" }, { k: "center", nm: "内部（中央）" }], o.wside) + "</select>") +
          row("撃破時", '<select class="mbc-sel" data-f="onDeath">' + opts([
            { k: "none", nm: "なし" }, { k: "boom", nm: "爆発（周囲にダメージ）" },
            { k: "summon", nm: "敵を召喚" }, { k: "heal", nm: "ほかの敵を回復" },
            { k: "buff", nm: "ほかの敵を強化" }], o.onDeath) + "</select>") +
        "</div>" +
        rowW("状態異常耐性", '<div class="mbc-chips" id="oRes">' + T.AILMENTS.filter(function (a) { return a.k; }).map(function (a) {
          return '<button data-res="' + a.k + '" class="' + ((o.resist || []).indexOf(a.k) >= 0 ? "on" : "") + '">' + esc(a.nm) + "</button>";
        }).join("") + "</div>") +
      "</div>" +
      '<div class="mbc-btns"><button class="mbc-btn" id="oAI">🧠 行動パターン</button>' +
      '<button class="mbc-btn" id="oAtk">⚔ 攻撃エディタ（' + (o.attacks || []).length + "）</button>" +
      '<button class="mbc-btn" id="oImg">🖼 画像</button></div>';
    } else {
      h += '<div class="mbc-panel"><h3>設定</h3>' +
        rowW("名前", '<input class="mbc-in" data-f="nm" value="' + esc(o.nm || "") + '">') +
        (o.kind === "gimmick" ? row("ギミック", '<select class="mbc-sel" data-f="gim">' + opts(T.GIMS, o.gim) + "</select>") : "") +
        (o.kind === "block" ? row("通れる撃種", '<select class="mbc-sel" data-f="val">' + opts([
          { k: 0, nm: "どちらも通れない" }, { k: 1, nm: "反射だけ通れる" }, { k: 2, nm: "貫通だけ通れる" }], o.val) + "</select>") : "") +
        '<div class="mbc-grid2">' +
          row("発動条件", '<select class="mbc-sel" data-f="cond">' + opts([
            { k: "always", nm: "常時" }, { k: "turn", nm: "指定ターン" }, { k: "touch", nm: "接触" },
            { k: "wavestart", nm: "WAVE開始" }, { k: "hp", nm: "HP条件" }], o.cond) + "</select>") +
          row("発動ターン", '<input class="mbc-in num" data-f="turns" type="number" value="' + (o.turns | 0) + '">') +
          row("持続ターン", '<input class="mbc-in num" data-f="dur" type="number" value="' + (o.dur | 0) + '">') +
          row("ダメージ", '<input class="mbc-in num" data-f="dmg" type="number" value="' + (o.dmg | 0) + '">') +
          row("対象", '<select class="mbc-sel" data-f="target">' + opts([
            { k: "player", nm: "プレイヤーのみ" }, { k: "enemy", nm: "敵のみ" }, { k: "all", nm: "両方" }], o.target) + "</select>") +
          row("破壊可能", '<select class="mbc-sel" data-f="breakable">' + opts([{ k: 0, nm: "なし" }, { k: 1, nm: "あり" }], o.breakable) + "</select>") +
        "</div>" +
        rowW("破壊条件", '<input class="mbc-in" data-f="breakCond" value="' + esc(o.breakCond || "") + '">') +
        rowW("再発動条件", '<input class="mbc-in" data-f="recond" value="' + esc(o.recond || "") + '">') +
      "</div>" +
      '<div class="mbc-btns"><button class="mbc-btn" id="oImg">🖼 画像</button></div>';
    }
    openSheet(h);
    var card = el("mbcSheetCard");
    card.querySelectorAll("[data-f]").forEach(function (e) {
      e.oninput = e.onchange = function () {
        var f = e.getAttribute("data-f");
        var v = e.value;
        if (f === "x") o.x = clamp(num(v, 0) / W, 0, 1);
        else if (f === "y") o.y = clamp(num(v, 0) / H, 0, 1);
        else if (["w", "h", "rot", "size", "hp", "atk", "def", "spd", "r", "weight", "cd",
                  "boss", "weak", "val", "turns", "dur", "dmg", "breakable"].indexOf(f) >= 0) o[f] = num(v, 0);
        else if (f === "weakMul") o[f] = num(v, 1);
        else o[f] = v;
        if (f === "boss") { o.kind = o.boss ? "boss" : "enemy"; }
        curQ().at = U.nowText(); save(); drawStage();
      };
    });
    var res = el("oRes");
    if (res) res.querySelectorAll("[data-res]").forEach(function (x) {
      x.onclick = function () {
        var k = x.getAttribute("data-res");
        o.resist = o.resist || [];
        var i = o.resist.indexOf(k);
        if (i >= 0) o.resist.splice(i, 1); else o.resist.push(k);
        x.classList.toggle("on"); save();
      };
    });
    if (el("oAI")) el("oAI").onclick = function () { openAISheet(o); };
    if (el("oAtk")) el("oAtk").onclick = function () { openAtkSheet(o); };
    if (el("oImg")) el("oImg").onclick = function () { pickImage(function (u) { o.img = u; save(); drawStage(); toast("画像を設定しました"); }); };
  }

  function pickImage(cb) {
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var img = new Image(), fr = new FileReader();
      fr.onload = function () {
        img.onload = function () {
          /* ★ そのまま data URL にすると数MBになる。<b>256px の正方形</b>に縮めて持つ。 */
          var c = document.createElement("canvas"); c.width = c.height = 256;
          var g = c.getContext("2d");
          var s = Math.min(img.width, img.height);
          g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
          cb(c.toDataURL("image/webp", 0.82));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(f);
    };
    inp.click();
  }

  /* ══════════════════════════════════════════════════════════
     ⑥ 敵AI・行動パターン
     ══════════════════════════════════════════════════════════ */
  function openAISheet(o) {
    o.turns = o.turns || [];
    function draw() {
      var h = '<div class="mbc-sheet-hd"><b>🧠 ' + esc(o.nm) + " の行動パターン</b>" +
        '<button class="mbc-ico" onclick="MBCreate._u.closeSheet()">✕</button></div>' +
        rowW("行動タイプ", '<select class="mbc-sel" id="aiT">' + opts(T.AI, o.ai) + "</select>") +
        '<div class="mbc-note" id="aiD"></div>' +
        '<div class="mbc-panel" style="margin-top:10px"><h3>ターンごとの行動<span>上から順に</span></h3>' +
        '<div class="mbc-list" id="aiL">' + (o.turns.length ? o.turns.map(function (t, i) {
          return '<div class="mbc-item"><span class="ic">' + (i + 1) + "</span>" +
            '<span class="tx"><b>' + esc((T.ACTS.filter(function (z) { return z.k === t; })[0] || {}).nm || t) + "</b>" +
            "<small>" + (i + 1) + "ターン目</small></span>" +
            '<span class="act"><button data-up="' + i + '">↑</button><button data-dn="' + i + '">↓</button>' +
            '<button class="dan" data-rm="' + i + '">🗑</button></span></div>';
        }).join("") : '<div class="mbc-note">まだありません。下から足せます。</div>') + "</div>" +
        '<div class="mbc-row" style="margin-top:9px"><select class="mbc-sel" id="aiAdd">' + opts(T.ACTS, "move") + "</select>" +
        '<button class="mbc-btn pri" id="aiAddGo">＋ 足す</button></div>' +
        row("ループ", '<select class="mbc-sel" id="aiLoop">' + opts([{ k: 1, nm: "くり返す" }, { k: 0, nm: "1回だけ" }], o.loop) + "</select>") +
        "</div>" +
        rowW("特定キャラを狙う（キャラ名）", '<input class="mbc-in" id="aiTg" value="' + esc(o.aiTarget || "") + '">');
      openSheet(h);
      el("aiD").textContent = (T.AI.filter(function (z) { return z.k === o.ai; })[0] || {}).d || "";
      el("aiT").onchange = function () { o.ai = el("aiT").value; save(); draw(); };
      el("aiLoop").onchange = function () { o.loop = +el("aiLoop").value; save(); };
      el("aiTg").oninput = function () { o.aiTarget = el("aiTg").value; save(); };
      el("aiAddGo").onclick = function () { o.turns.push(el("aiAdd").value); o.ai = "custom"; save(); draw(); };
      el("mbcSheetCard").querySelectorAll("[data-rm]").forEach(function (x) {
        x.onclick = function () { o.turns.splice(+x.getAttribute("data-rm"), 1); save(); draw(); };
      });
      el("mbcSheetCard").querySelectorAll("[data-up]").forEach(function (x) {
        x.onclick = function () { var i = +x.getAttribute("data-up"); if (i > 0) { var t = o.turns[i]; o.turns[i] = o.turns[i - 1]; o.turns[i - 1] = t; save(); draw(); } };
      });
      el("mbcSheetCard").querySelectorAll("[data-dn]").forEach(function (x) {
        x.onclick = function () { var i = +x.getAttribute("data-dn"); if (i < o.turns.length - 1) { var t = o.turns[i]; o.turns[i] = o.turns[i + 1]; o.turns[i + 1] = t; save(); draw(); } };
      });
    }
    draw();
  }

  /* ══════════════════════════════════════════════════════════
     ⑦ 攻撃エディタ
     ══════════════════════════════════════════════════════════ */
  function openAtkSheet(o) {
    o.attacks = o.attacks || [];
    function draw(openIdx) {
      var h = '<div class="mbc-sheet-hd"><b>⚔ ' + esc(o.nm) + " の攻撃</b>" +
        '<button class="mbc-ico" onclick="MBCreate._u.closeSheet()">✕</button></div>';
      h += '<div class="mbc-list">' + (o.attacks.length ? o.attacks.map(function (a, i) {
        return '<div class="mbc-item ' + (i === openIdx ? "on" : "") + '" data-sel="' + i + '">' +
          '<span class="ic">' + (i + 1) + "</span>" +
          '<span class="tx"><b>' + esc((T.ATKS.filter(function (z) { return z.k === a.type; })[0] || {}).nm || a.type) + "</b>" +
          "<small>威力 " + (a.pow | 0) + " ・ 倍率 " + a.mul + " ・ 弾数 " + (a.bullets | 0) + "</small></span>" +
          '<span class="act"><button class="dan" data-rm="' + i + '">🗑</button></span></div>';
      }).join("") : '<div class="mbc-note">攻撃がまだありません。</div>') + "</div>" +
      '<div class="mbc-btns"><button class="mbc-btn pri" id="atAdd">＋ 攻撃を追加</button></div>';
      if (openIdx != null && o.attacks[openIdx]) {
        var a = o.attacks[openIdx];
        h += '<div class="mbc-panel" style="margin-top:10px"><h3>攻撃 ' + (openIdx + 1) + " の設定</h3>" +
          '<div class="mbc-grid2">' +
          row("攻撃タイプ", '<select class="mbc-sel" data-a="type">' + opts(T.ATKS, a.type) + "</select>") +
          row("威力", '<input class="mbc-in num" data-a="pow" type="number" value="' + (a.pow | 0) + '">') +
          row("倍率", '<input class="mbc-in num" data-a="mul" type="number" step="0.1" value="' + a.mul + '">') +
          row("弾数", '<input class="mbc-in num" data-a="bullets" type="number" value="' + (a.bullets | 0) + '">') +
          row("射程", '<input class="mbc-in num" data-a="range" type="number" step="0.1" value="' + a.range + '">') +
          row("範囲", '<select class="mbc-sel" data-a="area">' + opts([
            { k: "line", nm: "直線" }, { k: "circle", nm: "円" }, { k: "fan", nm: "扇" }, { k: "all", nm: "全体" }], a.area) + "</select>") +
          row("方向", '<select class="mbc-sel" data-a="dir">' + opts([
            { k: "aim", nm: "指定方向（狙う）" }, { k: "fixed", nm: "固定" }, { k: "rand", nm: "ランダム" },
            { k: "spread", nm: "放射" }], a.dir) + "</select>") +
          row("速度", '<input class="mbc-in num" data-a="speed" type="number" value="' + (a.speed | 0) + '">') +
          row("追尾性能", '<input class="mbc-in num" data-a="homing" type="number" step="0.1" value="' + a.homing + '">') +
          row("発射間隔", '<input class="mbc-in num" data-a="interval" type="number" step="0.1" value="' + a.interval + '">') +
          row("持続時間", '<input class="mbc-in num" data-a="dur" type="number" step="0.1" value="' + a.dur + '">') +
          row("攻撃対象", '<select class="mbc-sel" data-a="target">' + opts([
            { k: "all", nm: "全体" }, { k: "near", nm: "近い1体" }, { k: "far", nm: "遠い1体" },
            { k: "low", nm: "HPが低い1体" }], a.target) + "</select>") +
          row("状態異常", '<select class="mbc-sel" data-a="ailment">' + opts(T.AILMENTS, a.ailment) + "</select>") +
          "</div>" +
          '<div class="mbc-chips" style="margin-top:6px">' +
            '<button data-tg="pierce" class="' + (a.pierce ? "on" : "") + '">貫通</button>' +
            '<button data-tg="reflect" class="' + (a.reflect ? "on" : "") + '">反射</button>' +
          "</div>" +
          rowW("追加効果", '<input class="mbc-in" data-a="extra" value="' + esc(a.extra || "") + '">') +
          "</div>";
      }
      openSheet(h);
      el("atAdd").onclick = function () { o.attacks.push(M._newAttack()); save(); draw(o.attacks.length - 1); };
      el("mbcSheetCard").querySelectorAll("[data-sel]").forEach(function (x) {
        x.onclick = function () { draw(+x.getAttribute("data-sel")); };
      });
      el("mbcSheetCard").querySelectorAll("[data-rm]").forEach(function (x) {
        x.onclick = function (ev) { ev.stopPropagation(); o.attacks.splice(+x.getAttribute("data-rm"), 1); save(); draw(null); };
      });
      el("mbcSheetCard").querySelectorAll("[data-a]").forEach(function (e) {
        e.oninput = e.onchange = function () {
          var a2 = o.attacks[openIdx]; if (!a2) return;
          var f = e.getAttribute("data-a");
          a2[f] = (["pow", "bullets", "speed"].indexOf(f) >= 0) ? num(e.value, 0)
                : (["mul", "range", "homing", "interval", "dur"].indexOf(f) >= 0) ? num(e.value, 0)
                : e.value;
          save();
        };
      });
      el("mbcSheetCard").querySelectorAll("[data-tg]").forEach(function (x) {
        x.onclick = function () {
          var a2 = o.attacks[openIdx]; if (!a2) return;
          var f = x.getAttribute("data-tg");
          a2[f] = a2[f] ? 0 : 1; x.classList.toggle("on"); save();
        };
      });
    }
    draw(o.attacks.length ? 0 : null);
  }

  /* ══════════════════════════════════════════════════════════
     ⑧ ギミックエディタ
     ══════════════════════════════════════════════════════════ */
  function openGimSheet() {
    var wv = curW(); wv.gims = wv.gims || [];
    function draw(openIdx) {
      var groups = {};
      T.GIMS.forEach(function (g) { (groups[g.g] = groups[g.g] || []).push(g); });
      var h = '<div class="mbc-sheet-hd"><b>⚙ WAVE ' + (V.wave + 1) + " のギミック</b>" +
        '<button class="mbc-ico" onclick="MBCreate._u.closeSheet()">✕</button></div>' +
        '<div class="mbc-note">タップで足す／外す。値の意味はギミックごとにちがいます（下で調整）。</div>' +
        Object.keys(groups).map(function (gk) {
          return '<div style="margin-top:8px"><div class="mbc-note"><b>' + esc(gk) + "</b></div>" +
            '<div class="mbc-chips" style="margin-top:4px">' + groups[gk].map(function (g) {
              var on = wv.gims.some(function (z) { return z.k === g.k; });
              return '<button data-g="' + g.k + '" class="' + (on ? "on" : "") + '">' + esc(g.nm) + "</button>";
            }).join("") + "</div></div>";
        }).join("");
      h += '<div class="mbc-panel" style="margin-top:10px"><h3>入れているギミック</h3><div class="mbc-list">' +
        (wv.gims.length ? wv.gims.map(function (x, i) {
          var nm = (T.GIMS.filter(function (z) { return z.k === x.k; })[0] || {}).nm || x.k;
          return '<div class="mbc-item ' + (i === openIdx ? "on" : "") + '" data-gs="' + i + '">' +
            '<span class="ic">⚙</span><span class="tx"><b>' + esc(nm) + "</b><small>値 " + x.v +
            " ・ ダメージ " + (x.dmg | 0) + "</small></span>" +
            '<span class="act"><button class="dan" data-gr="' + i + '">🗑</button></span></div>';
        }).join("") : '<div class="mbc-note">まだありません。</div>') + "</div>";
      if (openIdx != null && wv.gims[openIdx]) {
        var x = wv.gims[openIdx];
        h += '<div class="mbc-grid2" style="margin-top:9px">' +
          row("値（数・個数）", '<input class="mbc-in num" data-gf="v" type="number" step="1" value="' + num(x.v, 1) + '">') +
          row("ダメージ", '<input class="mbc-in num" data-gf="dmg" type="number" value="' + (x.dmg | 0) + '">') +
          row("発動条件", '<select class="mbc-sel" data-gf="cond">' + opts([
            { k: "always", nm: "常時" }, { k: "turn", nm: "指定ターン" }, { k: "wavestart", nm: "WAVE開始" },
            { k: "hp", nm: "HP条件" }, { k: "switch", nm: "スイッチ" }], x.cond || "always") + "</select>") +
          row("発動ターン", '<input class="mbc-in num" data-gf="turn" type="number" value="' + (x.turn | 0) + '">') +
          row("持続ターン", '<input class="mbc-in num" data-gf="dur" type="number" value="' + (x.dur | 0 || 3) + '">') +
          row("対象", '<select class="mbc-sel" data-gf="target">' + opts([
            { k: "player", nm: "プレイヤーのみ" }, { k: "enemy", nm: "敵のみ" }, { k: "all", nm: "両方" }], x.target || "player") + "</select>") +
          row("破壊可能", '<select class="mbc-sel" data-gf="breakable">' + opts([{ k: 0, nm: "なし" }, { k: 1, nm: "あり" }], x.breakable | 0) + "</select>") +
          row("再発動", '<select class="mbc-sel" data-gf="re">' + opts([{ k: 0, nm: "しない" }, { k: 1, nm: "する" }], x.re | 0) + "</select>") +
        "</div>";
        if (x.k === "dw" || x.k === "slowwall") {
          h += rowW("かかる壁", '<div class="mbc-chips" id="gSides">' + ["left", "right", "top", "bottom"].map(function (s) {
            var on = (x.sides || []).indexOf(s) >= 0;
            return '<button data-side="' + s + '" class="' + (on ? "on" : "") + '">' +
              ({ left: "左", right: "右", top: "上", bottom: "下" })[s] + "</button>";
          }).join("") + "</div>");
        }
        h += rowW("破壊条件", '<input class="mbc-in" data-gf="breakCond" value="' + esc(x.breakCond || "") + '">');
      }
      h += "</div>";
      openSheet(h);
      el("mbcSheetCard").querySelectorAll("[data-g]").forEach(function (btn) {
        btn.onclick = function () {
          var k = btn.getAttribute("data-g");
          var i = -1; wv.gims.forEach(function (z, n) { if (z.k === k) i = n; });
          if (i >= 0) wv.gims.splice(i, 1);
          else wv.gims.push({ k: k, v: k === "grav" ? 120 : k === "warp" ? 2 : 3, dmg: 3000,
            cond: "always", turn: 1, dur: 3, target: "player", breakable: 0, re: 0, sides: ["left", "right"] });
          curQ().at = U.nowText(); save(); draw(null);
        };
      });
      el("mbcSheetCard").querySelectorAll("[data-gs]").forEach(function (btn) {
        btn.onclick = function () { draw(+btn.getAttribute("data-gs")); };
      });
      el("mbcSheetCard").querySelectorAll("[data-gr]").forEach(function (btn) {
        btn.onclick = function (ev) { ev.stopPropagation(); wv.gims.splice(+btn.getAttribute("data-gr"), 1); save(); draw(null); };
      });
      el("mbcSheetCard").querySelectorAll("[data-gf]").forEach(function (e) {
        e.oninput = e.onchange = function () {
          var g2 = wv.gims[openIdx]; if (!g2) return;
          var f = e.getAttribute("data-gf");
          g2[f] = (["v", "dmg", "turn", "dur", "breakable", "re"].indexOf(f) >= 0) ? num(e.value, 0) : e.value;
          save();
        };
      });
      var sd = el("gSides");
      if (sd) sd.querySelectorAll("[data-side]").forEach(function (btn) {
        btn.onclick = function () {
          var g2 = wv.gims[openIdx]; if (!g2) return;
          g2.sides = g2.sides || [];
          var s = btn.getAttribute("data-side"), i = g2.sides.indexOf(s);
          if (i >= 0) g2.sides.splice(i, 1); else g2.sides.push(s);
          btn.classList.toggle("on"); save();
        };
      });
    }
    draw(null);
  }

  /* ══════════════════════════════════════════════════════════
     ⑨ イベント・条件分岐（IF / THEN）
     ══════════════════════════════════════════════════════════ */
  function openEventSheet() {
    var wv = curW(); wv.events = wv.events || [];
    function draw() {
      var h = '<div class="mbc-sheet-hd"><b>🔀 WAVE ' + (V.wave + 1) + " のイベント</b>" +
        '<button class="mbc-ico" onclick="MBCreate._u.closeSheet()">✕</button></div>' +
        '<div class="mbc-note">「◯◯したら △△する」を IF / THEN で作れます。上から順に見ます。</div>';
      h += wv.events.map(function (ev, i) {
        return '<div class="mbc-panel" style="margin-top:9px"><h3>イベント ' + (i + 1) +
          '<span><button class="mbc-btn dan" data-er="' + i + '" style="padding:3px 9px">削除</button></span></h3>' +
          '<div class="mbc-grid2">' +
          row("IF（条件）", '<select class="mbc-sel" data-ef="' + i + ':ifk">' + opts(T.IFS, ev.ifk) + "</select>") +
          row("値", '<input class="mbc-in" data-ef="' + i + ':ifv" value="' + esc(ev.ifv || "") + '">') +
          "</div>" +
          '<div class="mbc-note" style="margin:-3px 0 7px">' +
            esc((T.IFS.filter(function (z) { return z.k === ev.ifk; })[0] || {}).v || "") + "</div>" +
          ev.then.map(function (t, j) {
            return '<div class="mbc-grid2">' +
              row("THEN " + (j + 1), '<select class="mbc-sel" data-ef="' + i + ":then" + j + ':k">' + opts(T.THENS, t.k) + "</select>") +
              row("値", '<input class="mbc-in" data-ef="' + i + ":then" + j + ':v" value="' + esc(t.v || "") + '">') +
              "</div>";
          }).join("") +
          '<div class="mbc-btns"><button class="mbc-btn" data-ea="' + i + '">＋ THEN を足す</button></div>' +
          "</div>";
      }).join("");
      h += '<div class="mbc-btns"><button class="mbc-btn pri" id="evAdd">＋ イベントを追加</button></div>';
      openSheet(h);
      el("evAdd").onclick = function () {
        wv.events.push({ ifk: "kill", ifv: "1", then: [{ k: "summon", v: "2" }] });
        curQ().at = U.nowText(); save(); draw();
      };
      el("mbcSheetCard").querySelectorAll("[data-er]").forEach(function (x) {
        x.onclick = function () { wv.events.splice(+x.getAttribute("data-er"), 1); save(); draw(); };
      });
      el("mbcSheetCard").querySelectorAll("[data-ea]").forEach(function (x) {
        x.onclick = function () { wv.events[+x.getAttribute("data-ea")].then.push({ k: "msg", v: "" }); save(); draw(); };
      });
      el("mbcSheetCard").querySelectorAll("[data-ef]").forEach(function (e) {
        e.oninput = e.onchange = function () {
          var p = e.getAttribute("data-ef").split(":");
          var ev = wv.events[+p[0]]; if (!ev) return;
          if (p[1] === "ifk") ev.ifk = e.value;
          else if (p[1] === "ifv") ev.ifv = e.value;
          else { var j = +p[1].slice(4); if (ev.then[j]) ev.then[j][p[2]] = e.value; }
          save();
        };
      });
    }
    draw();
  }

  /* ══════════════════════════════════════════════════════════
     ⑩ WAVE 遷移
     ══════════════════════════════════════════════════════════ */
  function openEndSheet() {
    var q = curQ(), wv = curW();
    wv.end = wv.end || { k: "all", v: 0 };
    openSheet('<div class="mbc-sheet-hd"><b>🏁 WAVE ' + (V.wave + 1) + " の遷移</b>" +
      '<button class="mbc-ico" onclick="MBCreate._u.closeSheet()">✕</button></div>' +
      rowW("終了条件", '<select class="mbc-sel" id="edK">' + opts(T.ENDS, wv.end.k) + "</select>") +
      rowW("値（ターン数・ギミック名など）", '<input class="mbc-in" id="edV" value="' + esc(wv.end.v || "") + '">') +
      rowW("次のWAVEへ", '<select class="mbc-sel" id="edN">' + opts(
        [{ k: 0, nm: "つぎの WAVE へ（順番どおり）" }].concat([1, 2, 3, 4, 5, 6].map(function (n) {
          return { k: n, nm: "WAVE " + n + " へ" };
        })).concat([{ k: 99, nm: "ここでクリア" }]), wv.next | 0) + "</select>") +
      rowW("メモ", '<input class="mbc-in" id="edM" value="' + esc(wv.note || "") + '">') +
      '<div class="mbc-btns"><button class="mbc-btn pri full" onclick="MBCreate._u.closeSheet()">とじる</button></div>');
    el("edK").onchange = function () { wv.end.k = el("edK").value; save(); };
    el("edV").oninput = function () { wv.end.v = el("edV").value; save(); };
    el("edN").onchange = function () { wv.next = +el("edN").value; save(); };
    el("edM").oninput = function () { wv.note = el("edM").value; save(); };
    q.at = U.nowText();
  }

  /* ══════════════════════════════════════════════════════════
     ⑪ キャラクター管理
     ══════════════════════════════════════════════════════════ */
  M.renderCharsImpl = function (b) {
    setTitle("キャラクター管理", S.chars.length + " 体");
    b.innerHTML =
      '<div class="mbc-btns" style="margin:0 0 10px"><button class="mbc-btn pri" id="cNew">＋ 新規作成</button></div>' +
      '<div class="mbc-list">' + (S.chars.length ? S.chars.map(function (c) {
        return '<div class="mbc-item" data-c="' + c.id + '">' +
          '<span class="ic">' + (c.img ? '<img src="' + esc(c.img) + '">' : "🧑") + "</span>" +
          '<span class="tx"><b>' + esc(c.nm) + "</b><small>" + eln(c.el) + " ・ Lv." + (c.lv | 0) +
          " ・ HP " + (c.hp | 0) + " / 攻 " + (c.atk | 0) + " / 速 " + (c.spd | 0) + "</small></span>" +
          '<span class="act"><button class="dan" data-cd="' + c.id + '">🗑</button></span></div>';
      }).join("") : '<div class="mbc-note">オリジナルキャラをここに登録できます。テストプレイでも使えます。</div>') + "</div>" +
      '<div class="mbc-panel" style="margin-top:10px"><h3>MagiBurst のキャラ</h3><div class="mbc-note">' +
      "テストプレイでは<b>MagiBurst の本物のキャラ（" + ((typeof CHAR_IDS !== "undefined" ? CHAR_IDS : []).length) + "体）</b>も" +
      "そのまま選べます。ここに登録するのは<b>まだゲームに無いオリジナルキャラ</b>です。</div></div>";
    el("cNew").onclick = function () { var c = M._newChar(); S.chars.push(c); save(); openCharSheet(c); render(); };
    b.querySelectorAll("[data-c]").forEach(function (x) {
      x.onclick = function () {
        var id = x.getAttribute("data-c");
        var c = S.chars.filter(function (z) { return z.id === id; })[0];
        if (c) openCharSheet(c);
      };
    });
    b.querySelectorAll("[data-cd]").forEach(function (x) {
      x.onclick = function (ev) {
        ev.stopPropagation();
        var id = x.getAttribute("data-cd");
        S.chars = S.chars.filter(function (z) { return z.id !== id; });
        save(); render();
      };
    });
  };
  function openCharSheet(c) {
    openSheet('<div class="mbc-sheet-hd"><b>🧑 キャラクター</b>' +
      '<button class="mbc-ico" onclick="MBCreate._u.closeSheet()">✕</button></div>' +
      rowW("名前", '<input class="mbc-in" data-c="nm" value="' + esc(c.nm) + '">') +
      '<div class="mbc-grid2">' +
      row("属性", '<select class="mbc-sel" data-c="el">' + opts(T.ELS, c.el) + "</select>") +
      row("撃種", '<select class="mbc-sel" data-c="shot">' + opts([{ k: "pierce", nm: "貫通" }, { k: "bounce", nm: "反射" }], c.shot) + "</select>") +
      row("HP", '<input class="mbc-in num" data-c="hp" type="number" value="' + (c.hp | 0) + '">') +
      row("攻撃力", '<input class="mbc-in num" data-c="atk" type="number" value="' + (c.atk | 0) + '">') +
      row("速度", '<input class="mbc-in num" data-c="spd" type="number" value="' + (c.spd | 0) + '">') +
      row("レベル", '<input class="mbc-in num" data-c="lv" type="number" value="' + (c.lv | 0) + '">') +
      row("必殺技Lv", '<input class="mbc-in num" data-c="ssLv" type="number" value="' + (c.ssLv | 0) + '">') +
      "</div>" +
      rowW("アビリティ", '<input class="mbc-in" data-c="abil" value="' + esc(c.abil || "") + '">') +
      rowW("友情・特殊攻撃", '<input class="mbc-in" data-c="fs" value="' + esc(c.fs || "") + '">') +
      rowW("必殺技", '<input class="mbc-in" data-c="ss" value="' + esc(c.ss || "") + '">') +
      rowW("メモ", '<textarea class="mbc-ta" data-c="note">' + esc(c.note || "") + "</textarea>") +
      '<div class="mbc-btns"><button class="mbc-btn" id="cImg">🖼 画像</button>' +
      '<button class="mbc-btn pri" onclick="MBCreate._u.closeSheet();MBCreate.render()">とじる</button></div>');
    el("mbcSheetCard").querySelectorAll("[data-c]").forEach(function (e) {
      e.oninput = e.onchange = function () {
        var f = e.getAttribute("data-c");
        c[f] = (["hp", "atk", "spd", "lv", "ssLv"].indexOf(f) >= 0) ? num(e.value, 0) : e.value;
        save();
      };
    });
    el("cImg").onclick = function () { pickImage(function (u) { c.img = u; save(); toast("画像を設定しました"); }); };
  }

  /* ══════════════════════════════════════════════════════════
     ⑫ 素材・ギャラリー ／ 設定
     ══════════════════════════════════════════════════════════ */
  M.renderGalleryImpl = function (b) {
    setTitle("素材・ギャラリー", "登録した画像");
    var imgs = [];
    S.chars.forEach(function (c) { if (c.img) imgs.push({ nm: c.nm, u: c.img }); });
    S.quests.forEach(function (q) {
      (q.waves || []).forEach(function (w) {
        (w.objs || []).forEach(function (o) { if (o.img) imgs.push({ nm: q.nm + " / " + (o.nm || o.kind), u: o.img }); });
      });
    });
    b.innerHTML = '<div class="mbc-panel"><h3>登録ずみの画像<span>' + imgs.length + " 件</span></h3>" +
      (imgs.length ? '<div class="mbc-pal">' + imgs.map(function (x) {
        return '<button><img src="' + esc(x.u) + '" style="width:100%;border-radius:6px" alt="">' + esc(x.nm.slice(0, 10)) + "</button>";
      }).join("") + "</div>" : '<div class="mbc-note">まだありません。敵やキャラの設定から「🖼 画像」で登録できます。</div>') +
      "</div>" +
      '<div class="mbc-panel"><h3>画像について</h3><div class="mbc-note">' +
      "登録した画像は<b>256×256 の WebP</b> に縮めて端末の中（IndexedDB）に保存します。" +
      "透過度・透明度の設定は<b>ありません</b>（ご指定）。</div></div>";
  };
  M.renderSettingsImpl = function (b) {
    setTitle("設定", "ステージエディター");
    b.innerHTML =
      '<div class="mbc-panel"><h3>データ</h3>' +
      '<div class="mbc-note">クエスト <b>' + S.quests.length + "</b> 件 ／ オリジナルキャラ <b>" + S.chars.length +
      "</b> 体 ／ テスト条件 <b>" + S.presets.length + "</b> 件</div>" +
      '<div class="mbc-btns"><button class="mbc-btn" id="stExp">⬇ 全部を書き出す</button>' +
      '<button class="mbc-btn" id="stImp">⬆ 読み込み</button></div>' +
      '<div class="mbc-btns"><button class="mbc-btn dan full" id="stClr">全部消す</button></div>' +
      "</div>" +
      '<div class="mbc-panel"><h3>Claude にわたす</h3><div class="mbc-note">' +
      "クエストの<b>エクスポート</b>で、端末の<b>ダウンロード</b>フォルダに<br>" +
      "・<b>MagiBurst-quest-◯◯.json</b>（このエディタで読み書きする形）<br>" +
      "・<b>MagiBurst-quest-◯◯.js</b>（mb-core.js に貼れるコード）<br>" +
      "の2つが保存されます。Claude には<b>「Downloads の MagiBurst-quest-◯◯.json を使って」</b>と" +
      "言えばそのまま読み取れます。</div></div>" +
      '<div class="mbc-panel"><h3>アクセスコード</h3><div class="mbc-note">' +
      "この端末では<b>入力ずみ</b>です。ほかの端末では <b>MB613Create26</b> が要ります。</div>" +
      '<div class="mbc-btns"><button class="mbc-btn" id="stLock">この端末でもコードを求める</button></div></div>';
    el("stExp").onclick = function () {
      var t = JSON.stringify({ format: "MagiBurst-Quest-All", v: 1, at: U.nowText(),
        quests: S.quests, chars: S.chars, presets: S.presets }, null, 1);
      U.download("MagiBurst-quests-all-" + U.safeName(U.nowText()) + ".json", t, "application/json");
      toast("ダウンロードに保存しました");
    };
    el("stImp").onclick = function () {
      var inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json";
      inp.onchange = function () {
        var f = inp.files && inp.files[0]; if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var d = JSON.parse(fr.result);
            if (Array.isArray(d.quests)) d.quests.forEach(function (q) { q.id = uid("q"); S.quests.push(q); });
            else if (d.quest) { d.quest.id = uid("q"); S.quests.push(d.quest); }
            if (Array.isArray(d.chars)) d.chars.forEach(function (c) { c.id = uid("c"); S.chars.push(c); });
            if (Array.isArray(d.presets)) d.presets.forEach(function (p) { p.id = uid("p"); S.presets.push(p); });
            save(1); render(); toast("読み込みました");
          } catch (e) { toast("読めませんでした"); }
        };
        fr.readAsText(f);
      };
      inp.click();
    };
    el("stClr").onclick = function () {
      ask("エディタのデータを<b>すべて</b>消します。もとに戻せません。", "全部消す").then(function (ok) {
        if (!ok) return;
        S.quests = []; S.chars = []; S.presets = [];
        save(1); render(); toast("消しました");
      });
    };
    el("stLock").onclick = function () {
      try { localStorage.removeItem("mbcreate_ok_v1"); } catch (e) {}
      toast("次に開くときコードを聞きます");
    };
  };

  /* ══════════════════════════════════════════════════════════
     ⑬ エクスポート
     ══════════════════════════════════════════════════════════ */
  function openExport(q) {
    var json = M.exportJson(q), code = M.exportCode(q);
    var base = "MagiBurst-quest-" + U.safeName(q.nm);
    openSheet('<div class="mbc-sheet-hd"><b>⬇ エクスポート</b>' +
      '<button class="mbc-ico" onclick="MBCreate._u.closeSheet()">✕</button></div>' +
      '<div class="mbc-note">2つの形で書き出せます。どちらも端末の<b>ダウンロード</b>に保存されます。<br>' +
      "Claude には<b>「Downloads の " + esc(base) + ".json を使って」</b>と言えばそのまま渡せます。</div>" +
      '<div class="mbc-btns" style="margin-top:9px">' +
      '<button class="mbc-btn pri" id="exJ">⬇ JSON</button>' +
      '<button class="mbc-btn pri" id="exC">⬇ コード(.js)</button>' +
      '<button class="mbc-btn" id="exCp">📋 コピー</button></div>' +
      '<div class="mbc-row" style="margin-top:9px"><select class="mbc-sel" id="exWhich">' +
      '<option value="json">JSON（読み込み用）</option><option value="code">コード（mb-core.js に貼る）</option>' +
      "</select></div>" +
      '<textarea class="mbc-out" id="exOut" readonly>' + esc(json) + "</textarea>");
    function cur() { return el("exWhich").value === "code" ? code : json; }
    el("exWhich").onchange = function () { el("exOut").value = cur(); };
    el("exJ").onclick = function () {
      U.download(base + ".json", json, "application/json"); toast("JSON を保存しました");
    };
    el("exC").onclick = function () {
      U.download(base + ".js", code, "text/javascript"); toast("コードを保存しました");
    };
    el("exCp").onclick = function () {
      var t = cur();
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast("コピーしました"); },
        function () { el("exOut").select(); toast("長押しでコピーしてください"); });
      else { el("exOut").select(); toast("長押しでコピーしてください"); }
    };
  }
  M.openExport = openExport;
  M.pickImage = pickImage;
  M.openObjSheet = openObjSheet;
})();
