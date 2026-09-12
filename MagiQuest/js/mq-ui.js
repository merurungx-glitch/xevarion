/* ══════════════════════════════════════════════════════════════
   MagiQuest — 画面とバトルの進行
   ──────────────────────────────────────────────────────────────
   基本ループ（ご指定）
     ガチャでキャラ獲得 → 編成 → クエスト選択 → MagiLex 由来の問題が出題
     → 回答パーツが盤面に出る → 選んで配置 → 答えを完成 → 正解
     → キャラが攻撃 → コンボ → 次の問題 → 敵撃破 → 報酬 → 育成 → もっと難しいクエストへ
   ══════════════════════════════════════════════════════════════ */
/* eslint-disable */
(function (global) {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var IMGD = "../img/";
  function faceOf(id) {
    var c = global.CHARS && CHARS[id];
    if (!c) return "";
    var f = c.th || c.img || "";
    return f.indexOf("/") >= 0 ? f : IMGD + f;
  }
  function toast(msg) {
    var t = $("#mqToast"); if (!t) return;
    t.textContent = msg; t.classList.add("on");
    clearTimeout(t._tm); t._tm = setTimeout(function () { t.classList.remove("on"); }, 1600);
  }

  /* ══════════ 画面の出しわけ ══════════ */
  var TABS = ["home", "quest", "party", "chars", "menu"];
  function go(scr) {
    $$(".scr").forEach(function (e) { e.classList.toggle("on", e.id === "scr" + scr); });
    $$("#mqNav button").forEach(function (b) { b.classList.toggle("on", b.dataset.go === scr); });
    if (scr === "home") paintHome();
    if (scr === "quest") paintQuest();
    if (scr === "party") paintParty();
    if (scr === "chars") paintChars();
    window.scrollTo(0, 0);
  }
  global.mqGo = go;

  /* ══════════ ホーム ══════════ */
  function paintHome() {
    var subs = MQ_DATA.subjects();
    $("#hmToday").textContent = subs[0] || "化学";
    $("#hmPow").textContent = MQ.teamPower().toLocaleString();
    var p = MQ.party();
    $("#hmParty").innerHTML = p.map(function (id, i) {
      var s = MQ.statsOf(id) || {};
      return '<div class="mq-slot' + (i === 0 ? " lead" : "") + '">'
        + '<img src="' + esc(faceOf(id)) + '" alt="">'
        + '<div class="lv">' + esc(s.nm || "") + "</div></div>";
    }).join("");
  }

  /* ══════════ クエスト ══════════ */
  var curSub = null;
  function paintQuest() {
    var subs = MQ_DATA.subjects();
    if (!curSub || subs.indexOf(curSub) < 0) curSub = subs[0];
    $("#qTabs").innerHTML = subs.map(function (s) {
      return '<button class="mq-tab' + (s === curSub ? " on" : "") + '" data-sub="' + esc(s) + '">'
        + esc(s) + "</button>";
    }).join("");
    var list = MQ.questsOf(curSub);
    $("#qList").innerHTML = list.length ? list.map(function (q) {
      var st = MQ.starOf(q.id);
      return '<button class="mq-q" data-q="' + esc(q.id) + '">'
        + '<div class="th">' + ["🧪", "⚗️", "🔬", "👑"][q.ci] + "</div>"
        + '<div class="in"><b>' + esc(q.nm) + "</b>"
        + "<small>全" + q.n + "問／WAVE " + q.waves + "／推奨 " + q.need.toLocaleString()
        + "／消費スタミナ " + q.stam + "</small></div>"
        + '<div class="st"><div class="stars">' + "★★★".slice(0, st) + '<span style="opacity:.25">'
        + "★★★".slice(st) + "</span></div>"
        + (st ? '<span class="cl">CLEAR</span>' : "") + "</div></button>";
    }).join("") : '<div class="mq-note">この科目の問題はまだありません。</div>';
  }

  /* ══════════ 編成 ══════════ */
  var pickSlot = -1;
  function paintParty() {
    var p = MQ.party();
    $("#pwPow").textContent = MQ.teamPower().toLocaleString();
    $("#pwParty").innerHTML = p.map(function (id, i) {
      var s = MQ.statsOf(id) || {};
      return '<button class="mq-slot' + (i === 0 ? " lead" : "") + '" data-slot="' + i + '">'
        + '<img src="' + esc(faceOf(id)) + '" alt="">'
        + '<div class="lv">' + esc(s.nm || "") + "</div></button>";
    }).join("");
    var lb = MQ.leaderBonus();
    $("#pwLead").innerHTML = "リーダー（いちばん左）の効果：<b>攻撃力 ×" + lb.atk.toFixed(2)
      + "</b>／<b>制限時間 +" + lb.time + "秒</b>" + (lb.hint ? "／<b>最初の1問にヒント</b>" : "");
  }
  function openPick(slot) {
    pickSlot = slot;
    var own = MQ.ownedIds(), p = MQ.party();
    $("#pickList").innerHTML = own.map(function (id) {
      var s = MQ.statsOf(id) || {};
      return '<button class="mq-cc' + (p.indexOf(id) >= 0 ? " on" : "") + '" data-pick="' + esc(id) + '">'
        + '<img src="' + esc(faceOf(id)) + '" alt="">'
        + '<div class="nm">' + esc(s.nm || id) + "</div></button>";
    }).join("");
    $("#pickOv").classList.add("on");
  }

  /* ══════════ キャラ一覧・詳細 ══════════ */
  function paintChars() {
    var own = MQ.ownedIds();
    $("#chCount").textContent = own.length + " 体";
    $("#chGrid").innerHTML = own.map(function (id) {
      var s = MQ.statsOf(id) || {};
      return '<button class="mq-cc" data-ch="' + esc(id) + '">'
        + '<img src="' + esc(faceOf(id)) + '" alt="">'
        + '<div class="nm">' + esc(s.nm || id) + "</div></button>";
    }).join("");
  }
  var MAXV = { hp: 9200, atk: 1600, def: 1100, spd: 560 };
  function openChar(id) {
    var s = MQ.statsOf(id); if (!s) return;
    var sk = MQ.skillsOf(id);
    function bar(k, label, v, max) {
      return '<div class="k">' + label + '</div><div class="bar"><i style="width:'
        + Math.max(4, Math.min(100, (v / max) * 100)).toFixed(0) + '%"></i></div>'
        + '<div class="v">' + v.toLocaleString() + "</div>";
    }
    function dots(n) { return "●●●".slice(0, n) + '<span style="opacity:.2">' + "●●●".slice(n) + "</span>"; }
    $("#chSheet").innerHTML =
      '<h3><span>' + esc(s.nm) + '</span><button class="x" data-close>✕</button></h3>'
      + '<div style="display:flex;gap:11px;margin-bottom:10px">'
      + '<img src="' + esc(faceOf(id)) + '" style="width:92px;height:92px;object-fit:cover;border-radius:13px;border:2.5px solid var(--mq-navy)">'
      + '<div style="flex:1;font-size:11.5px;font-weight:800;line-height:1.8;color:var(--mq-sub)">'
      + "属性：<b style='color:var(--mq-ink)'>" + esc((global.ELEM && ELEM[s.el] && ELEM[s.el].nm) || "-") + "</b><br>"
      + "回復 " + dots(s.heal) + "　クリティカル " + dots(s.crit) + "<br>"
      + "コンボ補助 " + dots(s.combo) + "　回答補助 " + dots(s.help) + "<br>"
      + "時間補助 " + dots(s.time) + "　盤面操作 " + dots(s.board)
      + "</div></div>"
      + '<div class="mq-stat">'
      + bar("hp", "HP", s.hp, MAXV.hp) + bar("atk", "攻撃力", s.atk, MAXV.atk)
      + bar("def", "防御力", s.def, MAXV.def) + bar("spd", "速度", s.spd, MAXV.spd)
      + "</div>"
      + sk.map(function (k) {
        var S2 = MQ.SKILLS[k]; if (!S2) return "";
        return '<div class="mq-sk"><span class="ic">' + S2.ic + "</span><div><b>" + esc(S2.nm)
          + "</b><small>" + esc(S2.desc) + "</small></div></div>";
      }).join("")
      + '<div class="mq-note" style="margin-top:10px">スキルは<b>教科に関係なく</b>使えるものだけです。'
      + "数学や英語のクエストが増えても、そのまま同じように働きます。</div>";
    $("#chOv").classList.add("on");
  }

  /* ══════════════════════════════════════════════════════════
     バトル
     ══════════════════════════════════════════════════════════ */
  var BT = null;
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pickQuestions(q) {
    var pool = shuffle(q.pool);
    var out = [], seen = {};
    for (var i = 0; i < pool.length && out.length < q.n; i++) {
      if (seen[pool[i].answer]) continue;           /* 同じ答えの問題は1回だけ */
      seen[pool[i].answer] = 1; out.push(pool[i]);
    }
    return out;
  }

  function startQuest(qid) {
    var q = MQ.questById(qid); if (!q) return;
    if (!MQ.useStam(q.stam)) { toast("スタミナが足りません（必要 " + q.stam + "）"); return; }
    var p = MQ.party();
    var qs = pickQuestions(q);
    if (qs.length < 2) { toast("この帯の問題がまだ足りません"); return; }
    var teamHp = p.reduce(function (a, id) { var s = MQ.statsOf(id); return a + (s ? s.hp : 0); }, 0);
    BT = {
      q: q, qs: qs, i: 0, wave: 1,
      enemyMax: q.hp, enemy: q.hp,
      hp: teamHp, hpMax: teamHp,
      combo: 0, maxCombo: 0, miss: 0, score: 0, dmgTotal: 0,
      lead: MQ.leaderBonus(), party: p, actor: 0,
      slots: [], used: {}, t0: 0, limit: 0, tick: null,
      tools: { timeplus: 1, hint: 1, shuffle: 2, clean: 1, power: 1, guard: 1, keep: 1 },
      buff: { power: 0, guard: 0, keep: 0 },
      done: false,
    };
    /* 使えるスキルは編成から集める（同じものは1回ぶんずつ増える） */
    BT.tools = { timeplus: 0, hint: 0, shuffle: 1, clean: 0, power: 0, guard: 0, keep: 0 };
    p.forEach(function (id) {
      MQ.skillsOf(id).forEach(function (k) { BT.tools[k] = (BT.tools[k] || 0) + 1; });
    });
    $("#scrBattle").classList.add("on");
    $("#mqNav").style.display = "none";
    nextQ(true);
  }
  global.mqStart = startQuest;

  function endTick() { if (BT && BT.tick) { clearInterval(BT.tick); BT.tick = null; } }

  function nextQ(first) {
    if (!BT || BT.done) return;
    if (BT.i >= BT.qs.length) { finish(true); return; }
    var q = BT.qs[BT.i];
    BT.slots = []; BT.used = {};
    BT.limit = (q.time + BT.lead.time) * 1000;
    BT.t0 = Date.now();
    BT.hintOn = (first && BT.lead.hint) ? 1 : 0;
    BT.pool = shuffle(q.pool);
    paintBattle();
    endTick();
    BT.tick = setInterval(function () {
      if (!BT || BT.done) return endTick();
      var left = BT.limit - (Date.now() - BT.t0);
      var r = Math.max(0, left / BT.limit);
      var bar = $("#btTime i"); if (bar) bar.style.width = (r * 100).toFixed(1) + "%";
      $("#btTime").classList.toggle("warn", r < 0.34);
      $("#btSec").textContent = Math.ceil(Math.max(0, left) / 1000) + "s";
      if (left <= 0) { endTick(); wrong("じかんぎれ…"); }
    }, 100);
  }

  function paintBattle() {
    if (!BT) return;
    var q = BT.qs[BT.i];
    $("#btWave").textContent = "WAVE " + BT.wave + "/" + BT.q.waves;
    $("#btQn").textContent = (BT.i + 1) + " / " + BT.qs.length + " 問";
    $("#btEnemyNm").textContent = BT.q.subject + "の魔物 — " + BT.q.nm;
    var r = Math.max(0, BT.enemy / BT.enemyMax);
    $("#btEnemyHp i").style.width = (r * 100).toFixed(1) + "%";
    $("#btEnemyN").textContent = Math.max(0, Math.round(BT.enemy)).toLocaleString()
      + " / " + BT.enemyMax.toLocaleString();
    $("#btCombo").textContent = BT.combo >= 2 ? (BT.combo + " COMBO") : "";
    /* 問題 */
    $("#btQ").innerHTML =
      '<span class="tag">' + esc(q.subject) + "・" + esc(q.genre) + "</span>"
      + '<span class="tag d">' + esc(q.diff) + "</span>"
      + '<div class="q">' + esc(q.stem) + "</div>"
      + (q.reading ? '<div class="rd">' + esc(q.reading) + "</div>" : "")
      + '<div class="rd" style="margin-top:5px">'
      + ({ formula: "化学式・反応式を組み立てよう", number: "数と単位を組み立てよう",
           phrase: "文を正しい順に並べよう", word: "答えの語を組み立てよう" }[q.form] || "")
      + "</div>";
    /* 回答欄 */
    var need = q.slots.length;
    var cells = [];
    for (var i = 0; i < need; i++) {
      var v = BT.slots[i];
      cells.push('<div class="sl' + (v == null ? " em" : "") + (v && v.length > 3 ? " wide" : "") + '"'
        + (v == null ? "" : ' data-back="' + i + '"') + ">" + (v == null ? "" : esc(v)) + "</div>");
    }
    $("#btAns").innerHTML = cells.join("");
    /* 盤面 */
    $("#btPool").innerHTML = BT.pool.map(function (t, i) {
      var hint = BT.hintOn && !BT.used[i] && t === q.slots[BT.slots.length];
      return '<button class="bt-p' + (BT.used[i] ? " used" : "") + (t.length > 4 ? " long" : "")
        + (hint ? " hint" : "") + '" data-p="' + i + '">' + esc(t) + "</button>";
    }).join("");
    /* 道具 */
    $("#btTools").innerHTML = Object.keys(BT.tools).filter(function (k) { return BT.tools[k] > 0; })
      .map(function (k) {
        var S2 = MQ.SKILLS[k]; if (!S2) return "";
        return '<button class="bt-tool" data-tool="' + k + '">' + S2.ic + " " + esc(S2.nm)
          + " ×" + BT.tools[k] + "</button>";
      }).join("");
    /* 味方 */
    $("#btTeam").innerHTML = BT.party.map(function (id, i) {
      var s = MQ.statsOf(id) || {};
      return '<div class="bt-m' + (i === BT.actor ? " act" : "") + '">'
        + '<img src="' + esc(faceOf(id)) + '" alt="">'
        + '<div class="b"><i style="width:' + (BT.hp / BT.hpMax * 100).toFixed(0) + '%"></i></div></div>';
    }).join("");
  }

  function fx(html, ms) {
    var w = $("#btFx"); if (!w) return;
    var d = document.createElement("div");
    d.innerHTML = html;
    w.appendChild(d);
    setTimeout(function () { try { w.removeChild(d); } catch (e) {} }, ms || 1000);
  }

  function place(idx) {
    if (!BT || BT.done) return;
    var q = BT.qs[BT.i];
    if (BT.used[idx]) return;
    if (BT.slots.length >= q.slots.length) return;
    BT.used[idx] = 1;
    BT.slots.push(BT.pool[idx]);
    BT.hintOn = 0;
    paintBattle();
    if (BT.slots.length === q.slots.length) judge();
  }
  function back(i) {
    if (!BT || BT.done) return;
    if (i !== BT.slots.length - 1) return;              /* いちばん後ろだけ取り消せる */
    var v = BT.slots.pop();
    for (var k in BT.used) { if (BT.used[k] && BT.pool[k] === v) { delete BT.used[k]; break; } }
    paintBattle();
  }

  function judge() {
    var q = BT.qs[BT.i];
    var ok = BT.slots.length === q.slots.length
      && BT.slots.every(function (v, i) { return v === q.slots[i]; });
    endTick();
    if (!ok) { wrong("パーツの組み合わせが違います。"); return; }
    /* ── 正解 ── */
    var leftRate = Math.max(0, (BT.limit - (Date.now() - BT.t0)) / BT.limit);
    var g = MQ.gradeOf(leftRate, 0);
    BT.combo++;
    BT.maxCombo = Math.max(BT.maxCombo, BT.combo);
    var actor = BT.party[BT.actor % BT.party.length];
    var s = MQ.statsOf(actor) || { atk: 100, crit: 0 };
    var crit = Math.random() < (s.crit || 0) * 0.06;
    var dmg = MQ.damageOf({
      atk: s.atk, grade: g, diffMul: q.mul, combo: BT.combo,
      lead: BT.lead, power: BT.buff.power > 0,
    });
    if (crit) dmg = Math.round(dmg * 1.8);
    if (BT.buff.power > 0) BT.buff.power--;
    BT.enemy -= dmg; BT.dmgTotal += dmg;
    BT.score += Math.round(dmg / 10) + BT.combo * 5;
    /* 回復もちがいれば少し戻る */
    if ((s.heal || 0) > 0) BT.hp = Math.min(BT.hpMax, BT.hp + Math.round(BT.hpMax * 0.012 * s.heal));
    BT.actor = (BT.actor + 1) % BT.party.length;
    fx('<div class="fx-flash"></div>', 400);
    fx('<div class="fx-grade" style="color:' + g.c + '">' + g.nm
      + (BT.combo >= 2 ? "<small>COMBO " + BT.combo + "</small>" : "")
      + (crit ? "<small>CRITICAL!</small>" : "") + "</div>", 900);
    fx('<div class="fx-dmg" style="top:26%">-' + dmg.toLocaleString() + "</div>", 900);
    paintBattle();
    setTimeout(function () {
      if (!BT || BT.done) return;
      if (BT.enemy <= 0) {
        if (BT.wave < BT.q.waves) {
          BT.wave++; BT.enemyMax = Math.round(BT.q.hp * (1 + BT.wave * 0.35));
          BT.enemy = BT.enemyMax;
          toast("WAVE " + BT.wave + " ！");
        } else { finish(true); return; }
      }
      BT.i++; nextQ();
    }, 780);
  }

  function wrong(msg) {
    if (!BT || BT.done) return;
    var q = BT.qs[BT.i];
    BT.miss++;
    if (BT.buff.guard > 0) {
      BT.buff.guard--;
      toast("ミスガードが守った！");
    } else {
      var def = BT.party.reduce(function (a, id) { var s = MQ.statsOf(id); return a + (s ? s.def : 0); }, 0) / BT.party.length;
      var hit = MQ.enemyHit(Math.round(BT.hpMax * 0.11), def);
      BT.hp = Math.max(0, BT.hp - hit);
      fx('<div class="fx-bad"><div class="fx-grade" style="color:#ff8aa4">BAD…<small>ENEMY ATTACK</small></div></div>', 1000);
      fx('<div class="fx-dmg" style="bottom:22%;color:#ff8aa4">-' + hit.toLocaleString() + "</div>", 900);
    }
    if (BT.buff.keep > 0) { BT.buff.keep--; toast("コンボキープ！"); }
    else BT.combo = 0;
    toast(msg + "　答え：" + q.answer);
    paintBattle();
    setTimeout(function () {
      if (!BT || BT.done) return;
      if (BT.hp <= 0) { finish(false); return; }
      BT.i++; nextQ();
    }, 1100);
  }

  function useTool(k) {
    if (!BT || BT.done || !BT.tools[k]) return;
    var q = BT.qs[BT.i];
    if (k === "timeplus") { BT.limit += 8000; toast("制限時間 +8秒"); }
    else if (k === "hint") { BT.hintOn = 1; toast("次に置くパーツを光らせました"); }
    else if (k === "shuffle") {
      var rest = BT.pool.filter(function (t, i) { return !BT.used[i]; });
      var sh = shuffle(rest), n = 0;
      BT.pool = BT.pool.map(function (t, i) { return BT.used[i] ? t : sh[n++]; });
      toast("盤面を並べ直しました");
    } else if (k === "clean") {
      var need = {}; q.slots.forEach(function (t) { need[t] = (need[t] || 0) + 1; });
      var have = {}; var removed = 0;
      BT.pool.forEach(function (t, i) {
        if (removed >= 2 || BT.used[i]) return;
        if ((need[t] || 0) > (have[t] || 0)) { have[t] = (have[t] || 0) + 1; return; }
        BT.used[i] = 1; removed++;
      });
      toast(removed ? "ダミーを" + removed + "枚消しました" : "消せるダミーがありません");
    } else if (k === "power") { BT.buff.power = 1; toast("次の攻撃が 1.6倍！"); }
    else if (k === "guard") { BT.buff.guard = 1; toast("次のミスを1回守ります"); }
    else if (k === "keep") { BT.buff.keep = 1; toast("次の1回はコンボが切れません"); }
    BT.tools[k]--;
    paintBattle();
  }

  function finish(win) {
    if (!BT || BT.done) return;
    BT.done = true; endTick();
    var q = BT.q;
    var star = 0;
    if (win) {
      star = 1;
      if (BT.miss <= Math.floor(BT.qs.length * 0.25)) star = 2;
      if (BT.miss === 0) star = 3;
      MQ.setStar(q.id, star);
      MQ.setBest(q.id, BT.score);
      /* ★ 報酬は XEVARION 共通の XEVA（xeva.js の XEVA.add）。
         ★ XEVAミッションは「MISSIONS＋META＋completeMission の3点セット」が要るので、
           まだ作っていない id は呼ばない（呼ぶと達成できないミッションが残る）。 */
      MQ.addXeva(20 + q.ci * 20, "MagiQuest " + q.subject + "・" + q.nm);
    }
    $("#scrBattle").classList.remove("on");
    $("#mqNav").style.display = "";
    $("#resBox").innerHTML =
      "<h2>" + (win ? "QUEST CLEAR" : "QUEST FAILED") + "</h2>"
      + (win ? '<div class="stars">' + "★★★".slice(0, star)
        + '<span style="opacity:.22">' + "★★★".slice(star) + "</span></div>" : "")
      + '<div class="rows">'
      + '<div class="row">クエスト<span>' + esc(q.subject + "・" + q.nm) + "</span></div>"
      + '<div class="row">最大コンボ<span>' + BT.maxCombo + " COMBO</span></div>"
      + '<div class="row">正解数<span>' + (BT.qs.length - BT.miss) + " / " + BT.qs.length + "</span></div>"
      + '<div class="row">総ダメージ<span>' + BT.dmgTotal.toLocaleString() + "</span></div>"
      + '<div class="row">スコア<span>' + BT.score.toLocaleString() + "</span></div>"
      + (win ? '<div class="row">獲得<span>+' + (20 + q.ci * 20) + " XEVA</span></div>" : "")
      + "</div>"
      + '<button class="mq-go" id="resNext">次へ</button>';
    go("result");
    $("#resNext").onclick = function () { go("quest"); };
    BT = null;
  }

  /* ══════════ クエスト詳細シート ══════════ */
  function openQuest(qid) {
    var q = MQ.questById(qid); if (!q) return;
    var pow = MQ.teamPower();
    $("#qSheet").innerHTML =
      '<h3><span>' + esc(q.subject + "・" + q.nm) + '</span><button class="x" data-close>✕</button></h3>'
      + '<div class="mq-note" style="background:#fff;border-style:solid">'
      + "出題は <b>MagiLex の" + esc(q.subject) + "の問題</b>から、"
      + "<b>" + esc(q.genre) + "</b>・<b>" + esc(q.chapter) + "</b>の帯を選んで出します（全 " + q.n + " 問）。<br>"
      + "WAVE " + q.waves + "／敵HP " + q.hp.toLocaleString()
      + "／消費スタミナ " + q.stam + "<br>"
      + "推奨総戦力 <b>" + q.need.toLocaleString() + "</b>（いまの編成 "
      + "<b style=\"color:" + (pow >= q.need ? "var(--mq-good)" : "var(--mq-bad)") + "\">"
      + pow.toLocaleString() + "</b>）</div>"
      + '<div class="mq-note" style="margin-top:8px">この帯に入っている問題：<b>'
      + q.pool.length + " 問</b>（毎回そこからランダムに出ます）</div>"
      + '<button class="mq-go" data-start="' + esc(q.id) + '">挑戦する</button>'
      + '<button class="mq-go sec" style="margin-top:8px" data-close>もどる</button>';
    $("#qOv").classList.add("on");
  }

  /* ══════════ できごと ══════════ */
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    var nav = t.closest && t.closest("#mqNav button");
    if (nav) { go(nav.dataset.go); return; }
    var gob = t.closest && t.closest("[data-go]");
    if (gob && !nav) { go(gob.dataset.go); return; }
    var tab = t.closest && t.closest("[data-sub]");
    if (tab) { curSub = tab.dataset.sub; paintQuest(); return; }
    var qb = t.closest && t.closest("[data-q]");
    if (qb) { openQuest(qb.dataset.q); return; }
    var sb = t.closest && t.closest("[data-start]");
    if (sb) { $("#qOv").classList.remove("on"); startQuest(sb.dataset.start); return; }
    var sl = t.closest && t.closest("[data-slot]");
    if (sl) { openPick(+sl.dataset.slot); return; }
    var pk = t.closest && t.closest("[data-pick]");
    if (pk) {
      var p = MQ.party().slice();
      var id = pk.dataset.pick;
      var at = p.indexOf(id);
      if (at >= 0) { var tmp = p[pickSlot]; p[pickSlot] = id; p[at] = tmp; }
      else p[pickSlot] = id;
      MQ.setParty(p); $("#pickOv").classList.remove("on"); paintParty(); return;
    }
    var ch = t.closest && t.closest("[data-ch]");
    if (ch) { openChar(ch.dataset.ch); return; }
    var pp = t.closest && t.closest("[data-p]");
    if (pp) { place(+pp.dataset.p); return; }
    var bk = t.closest && t.closest("[data-back]");
    if (bk) { back(+bk.dataset.back); return; }
    var tl = t.closest && t.closest("[data-tool]");
    if (tl) { useTool(tl.dataset.tool); return; }
    if (t.closest && t.closest("[data-close]")) {
      $$(".mq-ov").forEach(function (o) { o.classList.remove("on"); }); return;
    }
    if (t.classList && t.classList.contains("mq-ov")) { t.classList.remove("on"); return; }
  });

  /* ══════════ 起動 ══════════ */
  function boot() {
    $("#scrTitle .kv").style.backgroundImage = 'url("img/kv.webp")';
    $("#scrTitle").classList.add("on");
    $("#scrTitle").addEventListener("click", function () {
      $("#scrTitle").classList.remove("on");
      go("home");
    }, { once: true });
    /* データの読みこみ（重いので1回だけ数える） */
    try {
      var n = MQ_DATA.all().length;
      $("#hmQn").textContent = n.toLocaleString();
    } catch (e) { $("#hmQn").textContent = "-"; }
  }
  global.mqBoot = boot;
  /* ★ 動きの確認用。いまのバトルの中身を外から見られるようにしておく
     （ブラウザで「答えは何か」「どの札が正解か」をそのまま読める）。 */
  global.mqDebug = function () {
    if (!BT) return null;
    var q = BT.qs[BT.i] || {};
    return { i: BT.i, n: BT.qs.length, wave: BT.wave, combo: BT.combo, miss: BT.miss,
      enemy: BT.enemy, hp: BT.hp, answer: q.answer, form: q.form,
      slots: q.slots, filled: BT.slots.slice(), pool: BT.pool.slice() };
  };
})(window);
