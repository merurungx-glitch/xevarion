/* ══════════════════════════════════════════════════════════════
   Magi: Arcana Rush ── 画面

   7つの画面（ご指定のコンセプトどおり）:
     ① HOME      … プレイヤー情報・代表キャラ・主要メニュー・イベントバナー
     ② QUEST     … 章／難易度（Normal〜Abyss）／ステージ一覧
     ③ BATTLE    … スワイプ操作の盤面（mar-battle.js）
     ④ CHARACTER … キャラクター詳細（レアリティ・属性・ロール・成長・能力）
     ⑤ PARTY     … 4体編成・Party Power・属性バランス・Link 相性・共鳴レベル
     ⑥ SUMMON    … ★ ガチャは実装せず、XEVARION のガチャへ送る（ご指定）
     ⑦ SYSTEM    … 属性・Link Arts・Elemental Resonance・Arcana Skill / Burst
   ══════════════════════════════════════════════════════════════ */
"use strict";

const MAR_TABS = ["home", "quest", "chars", "party", "system"];
let marView = "home";
let marQCh = 1, marQDiff = "normal";
let marSlotPick = -1;          /* 編成で入れ替え中の枠 */

/* ══════════════ 小道具 ══════════════ */
function marEl_(id) { return document.getElementById(id); }
let _marToastT = 0;
function marToast(msg, ms) {
  const t = marEl_("marToast"); if (!t) return;
  t.innerHTML = msg; t.classList.add("on");
  clearTimeout(_marToastT);
  _marToastT = setTimeout(() => t.classList.remove("on"), ms || 2400);
}
window.marToast = marToast;
/* キャラの絵（このアプリは1つ下の階層なので ../img/ を見る） */
function marPic(id) { const c = CHARS[id]; return c ? c.img : ""; }
function marPicS(id) { const c = CHARS[id]; return c ? c.th : ""; }

function marGo(v) {
  if (MAR_TABS.indexOf(v) < 0) return;
  marView = v;
  MAR_TABS.forEach((k) => {
    const el = marEl_("v_" + k); if (el) el.classList.toggle("on", k === v);
    const tb = document.querySelector('.mar-tab[data-t="' + k + '"]');
    if (tb) tb.classList.toggle("on", k === v);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (v === "home") marPaintHome();
  if (v === "quest") marPaintQuest();
  if (v === "chars") marPaintChars();
  if (v === "party") marPaintParty();
  if (v === "system") marPaintSystem();
}
window.marGo = marGo;

/* ══════════════ ① ホーム ══════════════ */
function marRepChar() {
  const p = marParty();
  return p[0] || marOwnedIds()[0] || "hina";
}
function marPaintProfile() {
  const box = marEl_("marProf"); if (!box) return;
  let acc = {}, S = null;
  try { acc = XEVA.account.get() || {}; } catch (e) {}
  try { S = XEVA.status.get(); } catch (e) {}
  const lv = S ? S.lv : 1;
  const pct = S && S.need ? Math.round(Math.min(1, S.cur / S.need) * 100) : 100;
  const rep = marRepChar();
  box.innerHTML =
    '<div class="mar-av"><img src="' + marEsc("../img/" + (CHARS[rep] ? CHARS[rep].th : "")) + '" alt=""></div>' +
    '<div class="mar-pmain">' +
      '<div class="mar-pn"><b>' + marEsc(acc.name || "PLAYER") + "</b>" +
        '<i>RANK ' + lv + "</i></div>" +
      '<div class="mar-xp"><i style="width:' + pct + '%"></i></div>' +
      '<div class="mar-xpn">RANK EXP ' + (S ? marFmt(S.cur) + " / " + marFmt(S.need) : "—") + "</div>" +
    "</div>";
  const w = marEl_("marWal"); if (!w) return;
  let gem = 0, gold = 0, stam = "—", stamMax = 0;
  try { gem = XEVA.gem.get(); } catch (e) {}
  try { gold = DB.gold | 0; } catch (e) {}
  try { stam = XEVA.status.text(S.stam); stamMax = S.max; } catch (e) {}
  w.innerHTML =
    '<div class="mar-w"><span class="k">⚡</span><div><div class="l">STAMINA</div>' +
      '<div class="v">' + stam + " / " + stamMax + "</div></div></div>" +
    '<div class="mar-w"><span class="k">🪙</span><div><div class="l">GOLD</div>' +
      '<div class="v">' + marFmt(gold) + "</div></div></div>" +
    '<div class="mar-w"><span class="k">💎</span><div><div class="l">CRYSTAL</div>' +
      '<div class="v">' + marFmt(gem) + "</div></div></div>";
}
function marPaintHome() {
  marPaintProfile();
  const rep = marRepChar();
  const c = CHARS[rep];
  const hero = marEl_("marHero");
  if (hero && c) {
    const rar = marRarity(rep), el = marEl(c.el);
    hero.innerHTML =
      '<img class="art" src="' + marEsc("../img/" + c.img) + '" alt="">' +
      '<div class="veil"></div>' +
      '<div class="rar" style="color:' + rar.g + ';border-color:' + rar.c + '">' + rar.nm + "</div>" +
      '<div class="cap"><div class="nm">' + marEsc(c.nm) + "</div>" +
        '<div class="sb"><span style="color:' + el.c + '">' + el.ico + " " + el.nm + "</span>　" +
        marEsc(marRole(rep)) + "　Lv." + marStats(rep).lv +
        '　<b style="color:var(--mar-gold)">CP ' + marFmt(marPower(rep)) + "</b></div></div>";
    hero.onclick = () => marOpenChar(rep);
  }
  const own = marOwnedIds().length;
  const st = marEl_("marHomeSub");
  if (st) st.textContent = "所持キャラ " + own + " 体／編成 " + marParty().length + " 体";
}

/* ══════════════ ② クエスト ══════════════ */
function marPaintQuest() {
  const chs = marEl_("marChTabs");
  if (chs) {
    chs.innerHTML = MAR_CHAPTERS.map((c) => {
      const open = marChapterOpen(c.n);
      return '<button class="mar-tb' + (c.n === marQCh ? " on" : "") + (open ? "" : " lock") + '"' +
        ' onclick="marPickCh(' + c.n + ')">' + (open ? "" : "🔒 ") + "Chapter " + c.n + "</button>";
    }).join("");
  }
  const dfs = marEl_("marDiffTabs");
  if (dfs) {
    dfs.innerHTML = MAR_DIFF.map((d) => {
      const open = marDiffOpen(marQCh, 0, d.k);
      return '<button class="mar-tb' + (d.k === marQDiff ? " on" : "") + (open ? "" : " lock") + '"' +
        ' onclick="marPickDiff(\'' + d.k + '\')">' + (open ? "" : "🔒 ") + d.nm + "</button>";
    }).join("");
  }
  const C = MAR_CHAPTERS[marQCh - 1];
  const hd = marEl_("marChHead");
  if (hd) {
    hd.innerHTML = '<div style="font-family:Orbitron,sans-serif;font-size:10px;font-weight:900;' +
      'letter-spacing:.14em;color:' + C.c + '">CHAPTER ' + C.n + " — " + C.en + "</div>" +
      '<div style="font-size:16px;font-weight:900;margin-top:2px">「' + C.nm + "」</div>";
  }
  const list = marEl_("marStageList"); if (!list) return;
  if (!marChapterOpen(marQCh)) {
    list.innerHTML = '<div class="mar-card mar-note">前の章の <b>' + (marQCh - 1) +
      "-5（Normal）</b> をクリアすると開きます。</div>";
    return;
  }
  list.innerHTML = [0, 1, 2, 3, 4].map((i) => {
    const s = marStage(marQCh, i, marQDiff);
    const open = marDiffOpen(marQCh, i, marQDiff) && (i === 0 || MAR.clear["s" + marQCh + "-" + i + "-" + marQDiff] || MAR.clear["s" + marQCh + "-" + i + "-normal"]);
    const cl = MAR.clear[s.id] | 0;
    const el = marEl(s.el);
    return '<div class="mar-stage' + (open ? "" : " lock") + '" onclick="' +
        (open ? "marOpenStage(" + marQCh + "," + i + ")" : "marToast('前のステージをクリアすると開きます')") + '">' +
      '<div class="sq" style="background:linear-gradient(140deg,' + el.c + '55,' + el.c + '18);color:' + el.g + '">' +
        (open ? el.ico : "🔒") + "</div>" +
      '<div class="bd"><div class="no">STAGE ' + s.key + "</div>" +
        '<div class="nm">' + marEsc(s.nm) + "</div>" +
        '<div class="mt">' +
          '<span class="mar-chip">推奨戦闘力 ' + marFmt(s.power) + "</span>" +
          '<span class="mar-chip">敵 Lv.' + s.enemyLv + "</span>" +
          '<span class="mar-chip">⚡' + s.cost + "</span>" +
          '<span class="mar-chip" style="color:' + el.c + '">BOSS ' + el.nm + "</span>" +
        "</div></div>" +
      '<div class="rk">' + (cl ? (cl >= 5 ? "S+" : cl >= 3 ? "S" : "A") : "—") + "</div>" +
    "</div>";
  }).join("");
}
function marPickCh(n) {
  if (!marChapterOpen(n)) { marToast("前の章をクリアすると開きます"); return; }
  marQCh = n; MAR.ch = n; marSave(); marPaintQuest();
}
window.marPickCh = marPickCh;
function marPickDiff(k) {
  if (!marDiffOpen(marQCh, 0, k)) { marToast("1つ下の難易度をクリアすると開きます"); return; }
  marQDiff = k; MAR.diff = k; marSave(); marPaintQuest();
}
window.marPickDiff = marPickDiff;

/* ステージの確認シート（推奨戦闘力・報酬・スタミナ） */
let _marStage = null;
function marOpenStage(ch, i) {
  const s = marStage(ch, i, marQDiff);
  _marStage = s;
  const info = marPartyInfo(marParty());
  const el = marEl(s.el);
  let stam = 0;
  try { stam = XEVA.status.getStamina(); } catch (e) {}
  marSheet("STAGE " + s.key,
    '<div class="mar-card">' +
      '<div style="font-size:15px;font-weight:900">' + marEsc(s.nm) + "</div>" +
      '<div class="mar-note" style="margin-top:4px">' + marEsc(s.chapter.nm) + "／" + s.diff.nm + "</div>" +
      '<div class="mar-pstat">' +
        marPs("RECOMMENDED POWER", marFmt(s.power)) +
        marPs("YOUR PARTY POWER", marFmt(info.power)) +
        marPs("ENEMY LEVEL", "Lv." + s.enemyLv) +
        marPs("WAVE", s.waves + " WAVE") +
        marPs("ENERGY COST", "⚡ " + s.cost + " / " + stam) +
        marPs("BOSS ELEMENT", '<span style="color:' + el.c + '">' + el.nm + "</span>") +
      "</div>" +
      '<div class="mar-note" style="margin-top:9px">報酬：<b>🪙' + marFmt(s.gold) +
        "</b>（初回は2倍）／<b>RANK EXP " + s.exp + "</b>" +
        (MAR.clear[s.id] ? "" : "<br>★ このステージは<b>初クリア</b>です") + "</div>" +
    "</div>" +
    '<div class="mar-btns" style="grid-template-columns:1fr 1fr">' +
      '<button class="mar-btn" onclick="marCloseSheet();marGo(\'party\')">編成を見る</button>' +
      '<button class="mar-btn gold" onclick="marBattleStart()">出撃する</button>' +
    "</div>");
}
window.marOpenStage = marOpenStage;
function marPs(l, v) {
  return '<div class="mar-ps"><div class="l">' + l + '</div><div class="v">' + v + "</div></div>";
}

/* ══════════════ ③ バトルの入口 ══════════════ */
function marBattleStart() {
  const s = _marStage; if (!s) return;
  let ok = true;
  try { ok = XEVA.status.spend(s.cost, "Magi: Arcana Rush " + s.key); } catch (e) {}
  if (!ok) { marToast("⚡ スタミナが足りません（" + s.cost + " 必要）"); return; }
  marCloseSheet();
  const ov = marEl_("marBattle"); if (ov) ov.classList.add("on");
  if (!marStartBattle(s)) { if (ov) ov.classList.remove("on"); }
}
window.marBattleStart = marBattleStart;
function marQuitBattle() {
  if (MB && !MB.over && !confirm("バトルをやめますか？（スタミナは戻りません）")) return;
  marEndBattle();
  const ov = marEl_("marBattle"); if (ov) ov.classList.remove("on");
  marPaintHome(); marPaintQuest();
}
window.marQuitBattle = marQuitBattle;

/* バトル画面の上下（HUD）。mar-battle.js から呼ばれる */
function marPaintHud() {
  if (!MB) return;
  const boss = MB.enemies.find((e) => e.boss && !e.dead) || MB.enemies.filter((e) => !e.dead)[0];
  const top = marEl_("marbTop");
  if (top) {
    const el = boss ? marEl(boss.el) : marEl("light");
    const p = boss ? Math.max(0, boss.hp / boss.maxhp) : 0;
    top.innerHTML =
      '<div class="marb-boss">' +
        '<span class="bel" style="background:' + el.c + '33;color:' + el.g + ';border:1px solid ' + el.c + '">' + el.nm + "</span>" +
        '<span class="bn">' + (boss && boss.boss ? "BOSS" : "ENEMY") + " Lv." + MB.stage.enemyLv + "</span>" +
        '<span style="margin-left:auto;font-family:Orbitron,sans-serif;font-size:10px;font-weight:900">' +
          (boss ? marFmt(Math.max(0, Math.round(boss.hp))) + " / " + marFmt(boss.maxhp) : "—") + "</span>" +
      "</div>" +
      '<div class="marb-hpbar"><i style="width:' + (p * 100).toFixed(1) + '%"></i></div>' +
      '<div class="marb-meta">' +
        "<span>WAVE <b>" + (MB.wave + 1) + " / " + MB.stage.waves + "</b></span>" +
        "<span>TURN <b>" + (MB.turn + 1) + "</b></span>" +
        "<span><b>" + MB.hits + "</b> Hits</span>" +
        "<span>STAGE <b>" + MB.stage.key + "</b></span>" +
        "<span>" + MB.stage.diff.nm + "</span>" +
      "</div>";
  }
  const hp = marEl_("marbTeam");
  if (hp) hp.innerHTML = '<i style="width:' + (MB.teamHp / MB.teamMax * 100).toFixed(1) + '%"></i>';
  const pt = marEl_("marbParty");
  if (pt) {
    pt.innerHTML = MB.balls.map((b, i) => {
      const g = b.gauge / MAR_BURST_TURNS, sk = b.skill / MAR_SKILL_TURNS;
      return '<div class="marb-m' + (i === MB.turn ? " turn" : "") + '" onclick="marOpenChar(\'' + b.id + '\')">' +
        (g >= 1 ? '<span class="rd">BURST</span>' : "") +
        '<img class="fc" src="' + marEsc("../img/" + b.ch.th) + '" alt="">' +
        '<div class="nm">' + marEsc(b.ch.nm) + "</div>" +
        '<div class="g"><i style="width:' + Math.min(100, g * 100) + '%"></i></div>' +
        '<div class="g sk"><i style="width:' + Math.min(100, sk * 100) + '%"></i></div>' +
      "</div>";
    }).join("");
  }
  const acts = marEl_("marbActs");
  if (acts) {
    const b = MB.balls[MB.turn];
    const canSk = b && b.skill >= MAR_SKILL_TURNS && MB.state === "aim";
    const canBu = b && b.gauge >= MAR_BURST_TURNS && MB.state === "aim";
    acts.innerHTML =
      '<button class="marb-a" ' + (canSk ? "" : "disabled ") + 'onclick="marFireSkill(' + MB.turn + ')">' +
        "ARCANA SKILL</button>" +
      '<button class="marb-a' + (MB.burstOn === MB.turn ? " on" : "") + '" ' + (canBu ? "" : "disabled ") +
        'onclick="marToggleBurst(' + MB.turn + ')">ARCANA BURST</button>';
  }
}
window.marPaintHud = marPaintHud;

/* 結果 */
function marShowResult(win, r) {
  const s = MB ? MB.stage : null;
  marSheet(win ? "QUEST CLEAR" : "QUEST FAILED",
    '<div class="mar-res"><div class="big' + (win ? "" : " lose") + '">' +
      (win ? "VICTORY" : "DEFEAT") + "</div>" +
      '<div class="mar-note" style="margin-top:6px">' +
        (s ? marEsc(s.nm) + "（" + s.key + "・" + s.diff.nm + "）" : "") + "</div>" +
      (win ?
        '<div class="mar-rw">' +
          '<div class="r"><div class="l">GOLD</div><div class="v">🪙' + marFmt(r.gold) + "</div></div>" +
          '<div class="r"><div class="l">RANK EXP</div><div class="v">+' + marFmt(r.exp) + "</div></div>" +
          (r.first ? '<div class="r"><div class="l">FIRST CLEAR</div><div class="v">×2</div></div>' : "") +
        "</div>" +
        (r.up ? '<div class="mar-note" style="margin-top:10px">🎉 <b>RANK ' + r.up.to +
          "</b> になりました！（スタミナが満タンに）</div>" : "")
        : '<div class="mar-note" style="margin-top:10px">チームHPが尽きました。<br>' +
          "<b>編成の属性</b>をボスに有利なものへ変えるか、<b>Link Arts</b> を多くつなぐと安定します。</div>") +
    "</div>" +
    '<div class="mar-btns" style="grid-template-columns:1fr 1fr">' +
      '<button class="mar-btn" onclick="marCloseSheet();marQuitBattle()">クエスト一覧へ</button>' +
      '<button class="mar-btn go" onclick="marRetry()">もう一度</button>' +
    "</div>");
}
window.marShowResult = marShowResult;
function marRetry() {
  const s = MB ? MB.stage : _marStage;
  marCloseSheet(); marEndBattle();
  _marStage = s;
  marBattleStart();
}
window.marRetry = marRetry;

/* ══════════════ ④ キャラクター ══════════════ */
let marCharFilter = "all";
function marPaintChars() {
  const g = marEl_("marCharGrid"); if (!g) return;
  let ids = marOwnedIds();
  if (marCharFilter !== "all") ids = ids.filter((id) => CHARS[id].el === marCharFilter);
  ids.sort((a, b) => marPower(b) - marPower(a));
  const cnt = marEl_("marCharCnt");
  if (cnt) cnt.textContent = ids.length + " 体";
  if (!ids.length) {
    g.innerHTML = '<div class="mar-card mar-note" style="grid-column:1/-1">' +
      "この属性のキャラをまだ持っていません。<br>" +
      "キャラクターは <b>XEVARION のガチャ</b>で仲間になります（SUMMON から行けます）。</div>";
    return;
  }
  g.innerHTML = ids.map((id) => {
    const c = CHARS[id], rar = marRarity(id), el = marEl(c.el);
    return '<div class="mar-cc" style="border-color:' + rar.c + '66" onclick="marOpenChar(\'' + id + '\')">' +
      '<img src="' + marEsc("../img/" + c.th) + '" alt="" loading="lazy">' +
      '<span class="rr" style="color:' + rar.g + '">' + rar.nm + "</span>" +
      '<span class="el" style="color:' + el.c + '">' + el.ja + "</span>" +
      '<span class="pw">' + marFmt(marPower(id)) + "</span>" +
      '<div class="nm">' + marEsc(c.nm) + "</div></div>";
  }).join("");
}
function marSetCharFilter(k) {
  marCharFilter = k;
  document.querySelectorAll("#marElTabs .mar-tb").forEach((b) => b.classList.toggle("on", b.dataset.el === k));
  marPaintChars();
}
window.marSetCharFilter = marSetCharFilter;

function marOpenChar(id) {
  const c = CHARS[id]; if (!c) return;
  const rar = marRarity(id), el = marEl(c.el), st = marStats(id), mx = marMaxStats(id);
  const sk = (typeof shotSkillOf === "function") ? shotSkillOf(id) : null;
  const cx = (typeof connectDef === "function") ? connectDef(id) : null;
  const sub = (typeof SUBFS !== "undefined") ? (SUBFS[c.subfs] || {}) : {};
  const abil = (typeof sortedAbil === "function" ? sortedAbil(c) : (c.abil || []));
  const lvCap = rar.lv;
  const html =
    '<div class="mar-dhero">' +
      '<img src="' + marEsc("../img/" + c.img) + '" alt="">' +
      '<div class="v"></div><div class="frame" style="box-shadow:inset 0 0 0 2px ' + rar.c +
        ',inset 0 0 46px ' + rar.c + '55"></div>' +
      '<div class="c"><div class="n">' + marEsc(c.nm) + "</div>" +
        '<div class="s"><b style="color:' + rar.g + '">' + rar.nm + "</b>　" +
        '<span style="color:' + el.c + '">' + el.ico + " " + el.nm + "</span>　" +
        marEsc(marRole(id)) + "　" + (c.shot === "pierce" ? "貫通" : "反射") + "</div></div></div>" +
    '<div class="mar-st">' +
      marS1("LEVEL", st.lv + " / " + MAX_LV) +
      marS1("POWER", marFmt(marPower(id))) +
      marS1("HP", marFmt(st.hp)) +
      marS1("ATK", marFmt(st.atk)) +
      marS1("SPD", marFmt(st.spd)) +
      marS1("ARC", marFmt(marArc(id))) +
      marS1("CRIT", marCrit(id) + "%") +
      marS1("CRIT DMG", marCritDmg(id) + "%") +
    "</div>" +
    '<div class="mar-sk"><div class="h">GROWTH — 成長</div>' +
      '<div class="mar-note" style="margin-top:5px">' +
        "・Level <b>" + st.lv + " / " + MAX_LV + "</b>（レアリティ上限 " + lvCap + "）<br>" +
        "・Limit Break <b>+" + (st.awk | 0) + " / " + MAX_AWK + "</b><br>" +
        "・Awakening <b>" + Math.min(rar.awk, (st.awk | 0) + 1) + " / " + rar.awk + "</b><br>" +
        "・Potential <b>" + Math.round(marPower(id) / Math.max(1, marPowerMax(id)) * 100) + " / 100</b>" +
      "</div></div>" +
    '<div class="mar-sk"><div class="h">TRAIT — アビリティ</div>' +
      '<div class="mar-abs">' +
        abil.map((a) => '<span class="mar-ab">' + abilName(a) + "</span>").join("") +
        (cx ? (cx.skills || []).map((s) => '<span class="mar-ab cx">🔗 ' + marEsc(s.nm) + "</span>").join("") : "") +
      "</div>" +
      (cx ? '<div class="mar-note" style="margin-top:6px">🔗 <b>' + marEsc(cx.nm) +
        "</b>：" + cx.condTx + "</div>" : "") +
    "</div>" +
    (sk ? '<div class="mar-sk"><div class="h">ARCANA SKILL</div>' +
      '<div class="n" style="color:' + sk.c + '">' + sk.nm + "</div>" +
      '<div class="p">' + sk.pow + "</div><div class=\"d\">" + sk.desc + "</div></div>" : "") +
    '<div class="mar-sk"><div class="h">ARCANA BURST</div>' +
      '<div class="n">' + marEsc(c.ssName || "") + "</div>" +
      '<div class="p">' + (c.ssPow || "") + "</div>" +
      '<div class="d">' + (c.ssDesc || "") + "</div></div>" +
    '<div class="mar-sk"><div class="h">LINK ARTS</div>' +
      '<div class="n">' + marEsc(c.fsName || "") + "</div>" +
      '<div class="p">' + (c.fsPow || "") + "</div>" +
      '<div class="d">' + (c.fsDesc || "") + "</div>" +
      '<div class="mar-note" style="margin-top:6px">サブリンク：<b>' + marEsc(sub.nm || "") + "</b>　" +
        (sub.desc || "") + "</div></div>" +
    '<div class="mar-sk"><div class="h">SOURCE — 入手方法</div>' +
      '<div class="d">' + ((typeof charSourceList === "function" ? charSourceList(id) : []).join("<br>") ||
        "XEVARION のガチャ") + "</div></div>" +
    '<div class="mar-btns" style="grid-template-columns:1fr 1fr">' +
      '<button class="mar-btn" onclick="marCloseSheet()">とじる</button>' +
      '<button class="mar-btn go" onclick="marPutInParty(\'' + id + '\')">編成に入れる</button></div>';
  marSheet(c.nm + "　" + (typeof charNoText === "function" ? charNoText(id) : ""), html);
}
window.marOpenChar = marOpenChar;
function marS1(k, v) {
  return '<div class="mar-s1"><span class="k">' + k + '</span><span class="v">' + v + "</span></div>";
}
function marPutInParty(id) {
  const p = marParty();
  if (p.indexOf(id) >= 0) { marToast("すでに編成に入っています"); return; }
  const slot = marSlotPick >= 0 ? marSlotPick : 3;
  p[slot] = id;
  marSetParty(p);
  marSlotPick = -1;
  marCloseSheet();
  marGo("party");
  marToast("✨ <b>" + CHARS[id].nm + "</b> を編成に入れました");
}
window.marPutInParty = marPutInParty;

/* ══════════════ ⑤ 編成 ══════════════ */
function marPaintParty() {
  const ids = marParty();
  const info = marPartyInfo(ids);
  const st = marEl_("marPStat");
  if (st) {
    st.innerHTML =
      marPs("PARTY POWER", marFmt(info.power)) +
      marPs("TOTAL HP", marFmt(info.hp)) +
      marPs("ELEMENT BALANCE", info.kinds + " 属性") +
      marPs("LINK COMPATIBILITY", info.compat + "%") +
      marPs("RESONANCE LEVEL", info.reso + " / 6") +
      marPs("MEMBERS", ids.length + " / 4");
  }
  const sl = marEl_("marSlots");
  if (sl) {
    sl.innerHTML = [0, 1, 2, 3].map((i) => {
      const id = ids[i];
      if (!id) return '<div class="mar-slot" onclick="marPickSlot(' + i + ')"><span class="pl">＋</span></div>';
      const c = CHARS[id], rar = marRarity(id), el = marEl(c.el);
      return '<div class="mar-slot has" style="border-color:' + rar.c + '" onclick="marPickSlot(' + i + ')">' +
        '<img src="' + marEsc("../img/" + c.th) + '" alt="">' +
        (i === 0 ? '<span class="ld">LEADER</span>' : "") +
        '<span class="ld" style="left:auto;right:3px;background:' + el.c + ';color:#0a0e26">' + el.ja + "</span>" +
        '<div class="nm">' + marEsc(c.nm) + "</div></div>";
    }).join("");
  }
  const bd = marEl_("marPBreak");
  if (bd) {
    const rows = ids.map((id) => {
      const c = CHARS[id], rar = marRarity(id), el = marEl(c.el);
      return '<div class="mar-r1"><span class="pair" style="color:' + rar.g + '">' + rar.nm + "</span>" +
        '<div style="flex:1;min-width:0"><div class="nm">' + marEsc(c.nm) + "</div>" +
        '<div class="ds"><span style="color:' + el.c + '">' + el.nm + "</span>　" + marRole(id) +
        "　Lv." + marStats(id).lv + "</div></div>" +
        '<span style="font-family:Orbitron,sans-serif;font-size:11px;font-weight:900;color:var(--mar-gold)">' +
        marFmt(marPower(id)) + "</span></div>";
    }).join("");
    /* 起こせる共鳴 */
    const combos = [];
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        const r = marResoOf(CHARS[ids[a]].el, CHARS[ids[b]].el);
        if (r) combos.push(r);
      }
    }
    bd.innerHTML = rows +
      (combos.length ? '<div class="mar-h" style="margin-top:12px"><span class="dot"></span>' +
        '<span class="t">RESONANCE — この編成で起こせる共鳴</span></div>' +
        combos.map((r) => '<div class="mar-r1"><span class="pair" style="color:' + r.c + '">' + r.nm + "</span>" +
          '<div style="flex:1"><div class="ds">' + r.desc + "</div></div></div>").join("")
        : '<div class="mar-note" style="margin-top:10px">同じ属性ばかりだと <b>Elemental Resonance</b> が起きません。' +
          "ちがう属性を混ぜてみてください。</div>");
  }
}
function marPickSlot(i) {
  marSlotPick = i;
  const ids = marParty();
  const cur = ids[i];
  const own = marOwnedIds().filter((id) => ids.indexOf(id) < 0 || id === cur)
    .sort((a, b) => marPower(b) - marPower(a));
  marSheet("メンバーをえらぶ（" + (i + 1) + "番目）",
    (cur ? '<div class="mar-btns" style="grid-template-columns:1fr"><button class="mar-btn" ' +
      'onclick="marClearSlot(' + i + ')">この枠を空にする</button></div>' : "") +
    '<div class="mar-grid" style="margin-top:10px">' +
      own.map((id) => {
        const c = CHARS[id], rar = marRarity(id), el = marEl(c.el);
        return '<div class="mar-cc" style="border-color:' + rar.c + '66" onclick="marSetSlot(' + i + ",'" + id + "')\">" +
          '<img src="' + marEsc("../img/" + c.th) + '" alt="" loading="lazy">' +
          '<span class="rr" style="color:' + rar.g + '">' + rar.nm + "</span>" +
          '<span class="el" style="color:' + el.c + '">' + el.ja + "</span>" +
          '<span class="pw">' + marFmt(marPower(id)) + "</span>" +
          '<div class="nm">' + marEsc(c.nm) + "</div></div>";
      }).join("") +
    "</div>");
}
window.marPickSlot = marPickSlot;
function marSetSlot(i, id) {
  const p = marParty();
  const at = p.indexOf(id);
  if (at >= 0) { const t = p[i]; p[i] = id; p[at] = t; }
  else p[i] = id;
  marSetParty(p.filter(Boolean));
  marCloseSheet(); marPaintParty();
}
window.marSetSlot = marSetSlot;
function marClearSlot(i) {
  const p = marParty(); p.splice(i, 1);
  marSetParty(p); marCloseSheet(); marPaintParty();
}
window.marClearSlot = marClearSlot;
function marAutoForm() {
  const s = _marStage;
  marSetParty(marAutoParty(s ? s.el : null));
  marPaintParty();
  marToast("⚙️ おすすめ編成にしました（属性をばらけさせています）");
}
window.marAutoForm = marAutoForm;
function marResetForm() { marSetParty([]); marPaintParty(); marToast("編成をリセットしました"); }
window.marResetForm = marResetForm;

/* ══════════════ ⑥ 召喚（＝ XEVARION のガチャへ）══════════════ */
function marOpenSummon() {
  let gem = 0;
  try { gem = XEVA.gem.get(); } catch (e) {}
  let fes = [];
  try {
    fes = Object.keys(FESTS).filter((k) => {
      const f = FESTS[k];
      if (!f || f.archive) return false;
      if (f.monthly) { const d = new Date().getDate(); return d >= f.monthly[0] && d <= f.monthly[1]; }
      if (f.luxGacha) return true;
      try { return !fesEnded(k); } catch (e) { return false; }
    });
  } catch (e) {}
  marSheet("SUMMON — 召喚",
    '<div class="mar-bn" onclick="marGoGacha(\'\')">' +
      '<img src="img/mar-key.webp" alt="">' +
      '<div class="in"><div class="t1">ARCANA SUMMON</div>' +
        '<div class="t2">Magi: Arcana Rush のキャラクターは <b>XEVARION のガチャ</b>で仲間になります</div></div>' +
      '<span class="go">GACHA へ</span></div>' +
    '<div class="mar-card" style="margin-top:10px">' +
      '<div class="mar-note">' +
        "★ このアプリには<b>ガチャを実装していません</b>（ご指定）。<br>" +
        "XEVARION のガチャで引いたキャラは、<b>そのまま Magi: Arcana Rush でも使えます</b>——" +
        "所持キャラ・レベル・限界突破は MagiBurst と<b>まるごと共通</b>です。<br>" +
        "所持 <b>💎" + marFmt(gem) + "</b>（＝ CRYSTAL）" +
      "</div></div>" +
    (fes.length ? '<div class="mar-h" style="margin-top:14px"><span class="dot"></span>' +
      '<span class="t">FEATURED — 開催中のピックアップ</span></div>' +
      fes.map((k) => {
        const f = FESTS[k];
        return '<div class="mar-stage" onclick="marGoGacha(\'' + k + '\')">' +
          '<div class="sq" style="background:linear-gradient(140deg,#a86bff55,#4b8bff22)">✦</div>' +
          '<div class="bd"><div class="no">PICKUP</div><div class="nm">' + marEsc(f.nm) + "</div>" +
          '<div class="mt"><span class="mar-chip">' + (f.chars || []).length + " 体</span>" +
          (f.monthly ? '<span class="mar-chip">毎月 ' + f.monthly[0] + "〜" +
            (f.monthly[1] >= 31 ? "末日" : f.monthly[1] + "日") + "</span>" :
            f.luxGacha ? '<span class="mar-chip">常時開催</span>' : "") +
          "</div></div><div class=\"rk\">›</div></div>";
      }).join("") : "") +
    '<div class="mar-btns" style="grid-template-columns:1fr;margin-top:12px">' +
      '<button class="mar-btn gold" onclick="marGoGacha(\'\')">XEVARION のガチャへ行く</button></div>');
}
window.marOpenSummon = marOpenSummon;
function marGoGacha(mode) {
  location.href = "../gacha.html" + (mode ? "#" + mode : "");
}
window.marGoGacha = marGoGacha;

/* ══════════════ ⑦ 属性・独自システム ══════════════ */
function marPaintSystem() {
  const box = marEl_("marSysBody"); if (!box) return;
  const all = MAR_EL_ORDER.map((k) => MAR_EL[k]).concat([MAR_EL_X.astral, MAR_EL_X.chaos]);
  box.innerHTML =
    '<div class="mar-h"><span class="dot"></span><span class="t">ELEMENTS — 7つの属性</span></div>' +
    '<div class="mar-els">' + all.map((e) =>
      '<div class="mar-e1" style="border-color:' + e.c + '55"><div class="i" style="color:' + e.c + '">' + e.ico + "</div>" +
      '<div class="n" style="color:' + e.g + '">' + e.nm + "</div><div class=\"j\">" + e.ja + "</div></div>").join("") +
    "</div>" +
    '<div class="mar-card mar-note" style="margin-top:9px">' +
      "味方が持つのは前の5つ。<b>ASTRAL</b> と <b>CHAOS</b> は<b>敵だけ</b>の属性です。<br>" +
      "・<b>ASTRAL</b>：" + MAR_EL_X.astral.desc + "<br>" +
      "・<b>CHAOS</b>：" + MAR_EL_X.chaos.desc + "<br>" +
      "★ 5属性どうしの相性は <b>FLAME → VOLT → FROST → FLAME</b>、<b>LUMEN ⇄ ABYSS</b>。" +
    "</div>" +

    '<div class="mar-h" style="margin-top:16px"><span class="dot"></span><span class="t">LINK ARTS</span></div>' +
    '<div class="mar-card mar-note">' +
      "ショットの途中で<b>味方にふれる</b>と、その味方の連携技が発動します。<br>" +
      "★ <b>ふれた順番で威力が変わります</b>——1体目 ×1.00 ／ 2体目 ×1.25 ／ 3体目 ×1.55 ／ 4体目以降 ×1.90。<br>" +
      "★ ヒット数が増えるほど重くなる <b>CHAIN</b> も同時に乗ります（10ヒットごとに +5%・最大 +50%）。" +
    "</div>" +

    '<div class="mar-h" style="margin-top:16px"><span class="dot"></span>' +
      '<span class="t">ELEMENTAL RESONANCE — 属性共鳴</span></div>' +
    '<div class="mar-card mar-note">1ショットの中で<b>ちがう属性のリンクを2つ</b>つなぐと共鳴が起きます。' +
      "組み合わせは全10通り。<b>CHAOS の敵は共鳴中だけ弱点になります</b>。</div>" +
    '<div class="mar-resos">' + Object.keys(MAR_RESO).map((k) => {
      const r = MAR_RESO[k], p = k.split("|");
      return '<div class="mar-r1" style="border-color:' + r.c + '44">' +
        '<span class="pair"><span style="color:' + marElColor(p[0]) + '">' + marElName(p[0]) + "</span>" +
        ' <span style="color:#8892bb">+</span> <span style="color:' + marElColor(p[1]) + '">' + marElName(p[1]) + "</span></span>" +
        '<div style="flex:1;min-width:0"><div class="nm" style="color:' + r.c + '">' + r.nm +
        ' <span style="font-family:\'Noto Sans JP\';font-size:9px;color:#9fb0e0">' + r.ja + "</span></div>" +
        '<div class="ds">' + r.desc + "（威力 ×" + r.pow + "）</div></div></div>";
    }).join("") + "</div>" +

    '<div class="mar-h" style="margin-top:16px"><span class="dot"></span><span class="t">ARCANA SKILL / BURST</span></div>' +
    '<div class="mar-card mar-note">' +
      "・<b>ARCANA SKILL</b>：キャラ固有のアクティブ。<b>" + MAR_SKILL_TURNS + "手番</b>ためると使えます。<br>" +
      "・<b>ARCANA BURST</b>：<b>" + MAR_BURST_TURNS + "手番</b>ためると撃てる必殺技。" +
      "予約してから引っぱって放つと、放った瞬間に発動して<b>そのショットのあいだ与ダメージが上がります</b>。<br>" +
      "・<b>CRITICAL</b>：キャラごとの CRIT で発生し、CRIT DMG ぶん重くなります。" +
    "</div>" +

    '<div class="mar-h" style="margin-top:16px"><span class="dot"></span><span class="t">RARITY — 6段階</span></div>' +
    '<div class="mar-rar">' + MAR_RARITY_ORDER.map((k) => {
      const r = MAR_RARITY[k];
      return '<div class="mar-rr" style="border-color:' + r.c + '55">' +
        '<span class="n" style="color:' + r.g + '">' + r.nm + "</span>" +
        "<span>最大 Lv." + r.lv + "　限界突破 +" + r.lb + "　覚醒 " + r.awk + "</span></div>";
    }).join("") + "</div>" +
    '<div class="mar-card mar-note" style="margin-top:9px">' +
      "レアリティは<b>そのキャラがどこで手に入るか</b>で決まります——" +
      "常設の限定ガチャ（極彩祭・極華祭・極煌祭・戦姫祭）が <b>ASTRAL</b>、" +
      "期間つきフェスが <b>MYTHIC</b>、プレミアム／GRAND DEBUT が <b>LEGENDARY</b>、" +
      "そのほかのSSRが <b>EPIC</b>、クロススキル持ちのSRが <b>RARE</b>、残りが <b>COMMON</b> です。" +
    "</div>";
}

/* ══════════════ シート ══════════════ */
function marSheet(title, html) {
  const ov = marEl_("marSheetOv"); if (!ov) return;
  marEl_("marSheetT").textContent = title;
  marEl_("marSheetB").innerHTML = html;
  ov.classList.add("on");
}
window.marSheet = marSheet;
function marCloseSheet() {
  const ov = marEl_("marSheetOv"); if (ov) ov.classList.remove("on");
}
window.marCloseSheet = marCloseSheet;

/* ══════════════ 背景の星 ══════════════ */
function marStars() {
  const cv = marEl_("marStars"); if (!cv) return;
  const g = cv.getContext("2d"); if (!g) return;
  let W = 0, H = 0, dots = [];
  const dpr = Math.min(devicePixelRatio || 1, 2);
  function resize() {
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(90, W * H / 11000));
    dots = [];
    for (let i = 0; i < n; i++) {
      dots.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.9 + 0.5,
        a: Math.random() * 6.28, sp: Math.random() * 0.02 + 0.004, vy: -(Math.random() * 0.09 + 0.02),
        c: ["#ffffff", "#bfe6ff", "#e0c8ff", "#ffe9a8"][(Math.random() * 4) | 0] });
    }
  }
  function frame() {
    g.clearRect(0, 0, W, H);
    dots.forEach((s) => {
      s.a += s.sp; s.y += s.vy;
      if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; }
      g.globalAlpha = 0.2 + Math.abs(Math.sin(s.a)) * 0.6;
      g.fillStyle = s.c;
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.2832); g.fill();
    });
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  resize(); addEventListener("resize", resize, { passive: true }); frame();
}

/* ══════════════ 起動 ══════════════ */
function marBoot() {
  marQCh = marChapterOpen(MAR.ch | 0) ? (MAR.ch | 0 || 1) : 1;
  marQDiff = MAR.diff || "normal";
  marStars();
  marGo("home");
  /* 属性の絞り込みタブ */
  const t = marEl_("marElTabs");
  if (t) {
    t.innerHTML = '<button class="mar-tb on" data-el="all" onclick="marSetCharFilter(\'all\')">ALL</button>' +
      MAR_EL_ORDER.map((k) => {
        const e = MAR_EL[k];
        return '<button class="mar-tb" data-el="' + k + '" onclick="marSetCharFilter(\'' + k + '\')" ' +
          'style="color:' + e.c + '">' + e.ico + " " + e.nm + "</button>";
      }).join("");
  }
  /* ウォレット・スタミナが動いたら書き直す */
  ["xeva:change", "xeva:synced", "xeva:status"].forEach((ev) =>
    window.addEventListener(ev, () => { if (marView === "home") marPaintProfile(); }));
  setInterval(() => { if (marView === "home" && !MB) marPaintProfile(); }, 20000);
  /* 初回だけ、この作品の遊びかたを出す */
  if (!MAR.seen.intro) {
    MAR.seen.intro = 1; marSave();
    setTimeout(marOpenIntro, 700);
  }
}
function marOpenIntro() {
  marSheet("WELCOME — Magi: Arcana Rush（β）",
    '<div class="mar-card mar-note">' +
      "<b>Magi: Arcana Rush</b> は、MagiBurst の遊びを土台にした魔導アクションRPGです。<br><br>" +
      "★ <b>キャラクターもガチャも XEVARION のもの</b>をそのまま使います。" +
      "所持キャラ・レベル・限界突破は MagiBurst と共通で、" +
      "このアプリの中には<b>ガチャがありません</b>——SUMMON から XEVARION のガチャへ行けます。<br><br>" +
      "★ 遊びかた：キャラを<b>引っぱって離す</b>と飛んでいきます。" +
      "敵にぶつけて削り、<b>味方にふれると Link Arts</b>、" +
      "<b>ちがう属性のリンクを2つつなぐと Elemental Resonance</b> が起きます。<br><br>" +
      "★ <b>β版</b>です。バランスや演出はこれから調整していきます。" +
    "</div>" +
    '<div class="mar-btns" style="grid-template-columns:1fr;margin-top:10px">' +
      '<button class="mar-btn go" onclick="marCloseSheet()">はじめる</button></div>');
}
window.marOpenIntro = marOpenIntro;

/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-29c β版のアクセスゲート（ご指定）
   ------------------------------------------------------------
   ・<b>開くたびに</b>アクセスコードの入力が要る。
     合っていても<b>端末に覚えない</b>（localStorage を一切使わない）ので、
     読みこみ直すたび・ガチャから戻るたびに、もう一度きかれる。
   ・コードそのものはソースに書かず、<b>FNV-1a のハッシュ</b>で突き合わせる。
     （総当たりを防ぐ強度はないが、「見えるところに答えが書いてある」状態はなくせる。
       community.html のプレイヤー一覧と同じやり方。）
   ・コードが合うまで <html class="mar-locked"> のままなので、
     ゲーム画面・下タブ・バトルは<b>表示もされない</b>し marBoot() も走らない。
   ══════════════════════════════════════════════════════════════ */
function marGateHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}
const MAR_GATE_HASH = "4a9ceced";   /* ＝ このアプリのアクセスコードのハッシュ */
function marGateEnter() {
  const inp = marEl_("marGateCode"), msg = marEl_("marGateMsg");
  const v = ((inp && inp.value) || "").trim();
  if (!v) { if (msg) { msg.className = "mg-msg"; msg.textContent = "アクセスコードを入力してください"; } return; }
  if (marGateHash(v) !== MAR_GATE_HASH) {
    if (msg) { msg.className = "mg-msg"; msg.textContent = "アクセスコードが違います"; }
    if (inp) { inp.value = ""; inp.focus(); }
    return;
  }
  if (msg) { msg.className = "mg-msg ok"; msg.textContent = "解除しました"; }
  if (inp) inp.value = "";
  /* ★ ここで localStorage に書かないこと（＝毎回きく、というご指定そのもの） */
  document.documentElement.classList.remove("mar-locked");
  marBoot();
}
window.marGateEnter = marGateEnter;

function marGateInit() {
  const inp = marEl_("marGateCode");
  if (inp) {
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") marGateEnter(); });
    /* スプラッシュが消えてから合わせる（先に focus すると画面が跳ねる端末がある） */
    setTimeout(() => { try { inp.focus(); } catch (e) {} }, 900);
  }
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", marGateInit);
else marGateInit();
