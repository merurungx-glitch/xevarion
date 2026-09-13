/* ══════════════════════════════════════════════════════════════
   mb-create.js — MagiBurst クエスト作成（ステージエディター）
   ------------------------------------------------------------
   ★ アクセスコード <b>MB613Create26</b> で、MagiBurst の<b>メニュー</b>から開く（ご指定）。
   ★ ねらい（ご指定）
     「ステージ画像を作るツール」ではなく<b>ゲームとして実際に動くステージを作るツール</b>。
       配置 → ステータス → 攻撃 → AI → ギミック → イベント → WAVE →
       キャラ・育成状態をえらぶ → テストプレイ → 調整 → 再テスト
     を<b>とても速く</b>まわせるようにする。
   ★ もうひとつ大事なこと（ご指定）
     「作成した端末から Claude などに指示したときに使用できるようにする」。
     → <b>エクスポート</b>で
        ① MBQ 形式の JSON（このエディタで読み書きする形）
        ② mb-core.js の <b>STAGES に貼れるコード</b>
       の両方を出し、<b>端末の「ダウンロード」フォルダに .json / .js として保存</b>する。
       Claude には「Downloads の MagiBurst-quest-◯◯.json を使って」と言えばそのまま渡せる。

   ── 置き場所 ──
     この1本に「データ・保存・変換・画面・テストプレイ」を全部入れてある。
     MagiBurst 本体（index.html）に足したのは
       ・メニューの1行（openQuestEditor）
       ・findStage が MBC の作ったステージも探せるようにする1行
     の2つだけ。

   ── 保存 ──
     IndexedDB（mbcreate / store）に置く。localStorage だと
     オリジナル画像（data URL）を入れた時点で容量を超える。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.MBCreate) return;

  var ACCESS_CODE = "MB613Create26";
  var OK_KEY = "mbcreate_ok_v1";
  var DB_NAME = "mbcreate", DB_STORE = "store", DB_VER = 1;
  var W = 720, H = 920;                       // 盤面の実寸（mb-core と同じ）

  /* ══════════════════════════════════════════════════════════
     0) ちいさな道具
     ══════════════════════════════════════════════════════════ */
  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function uid(p) { return (p || "q") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); }
  function today() { return new Date().toLocaleDateString("sv-SE"); }
  function nowText() {
    var d = new Date();
    return d.toLocaleDateString("sv-SE") + " " +
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function toast(t) {
    try { if (typeof window.toast === "function") { window.toast(t); return; } } catch (e) {}
    var d = document.createElement("div");
    d.textContent = t;
    d.style.cssText = "position:fixed;left:50%;bottom:120px;transform:translateX(-50%);z-index:2147481500;" +
      "padding:9px 16px;border-radius:99px;background:rgba(10,18,34,.94);color:#cfe0ff;" +
      "font:800 12px/1.4 'Noto Sans JP',sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4);max-width:86vw;text-align:center";
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2400);
  }
  /* ★ confirm() が出ない環境がある（MagiLex・MagiTier で踏んでいる）。
     画面の中のダイアログで代わりにする。 */
  function ask(msg, okTx) {
    return new Promise(function (res) {
      var ov = document.createElement("div");
      ov.className = "mbc-sheet on";
      ov.innerHTML = '<div class="mbc-sheet-card" style="max-width:420px;margin:auto;border-radius:14px">' +
        '<div class="mbc-note" style="font-size:12px;margin-bottom:12px">' + msg + "</div>" +
        '<div class="mbc-btns"><button class="mbc-btn" data-no>やめる</button>' +
        '<button class="mbc-btn dan" data-yes>' + esc(okTx || "実行する") + "</button></div></div>";
      document.body.appendChild(ov);
      ov.querySelector("[data-no]").onclick = function () { ov.remove(); res(false); };
      ov.querySelector("[data-yes]").onclick = function () { ov.remove(); res(true); };
      ov.onclick = function (e) { if (e.target === ov) { ov.remove(); res(false); } };
    });
  }

  /* ══════════════════════════════════════════════════════════
     1) 保存（IndexedDB）
     ══════════════════════════════════════════════════════════ */
  var _db = null;
  function openDB() {
    return new Promise(function (res, rej) {
      if (_db) return res(_db);
      var rq = indexedDB.open(DB_NAME, DB_VER);
      rq.onupgradeneeded = function () {
        var d = rq.result;
        if (!d.objectStoreNames.contains(DB_STORE)) d.createObjectStore(DB_STORE);
      };
      rq.onsuccess = function () { _db = rq.result; res(_db); };
      rq.onerror = function () { rej(rq.error); };
    });
  }
  function dbGet(k) {
    return openDB().then(function (d) {
      return new Promise(function (res) {
        var r = d.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(k);
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }
  function dbSet(k, v) {
    return openDB().then(function (d) {
      return new Promise(function (res) {
        var r = d.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).put(v, k);
        r.onsuccess = function () { res(true); };
        r.onerror = function () { res(false); };
      });
    }).catch(function () { return false; });
  }

  /* エディタの全データ（クエスト・オリジナルキャラ・テスト条件） */
  var S = { quests: [], chars: [], presets: [], at: 0 };
  function load() {
    return dbGet("data").then(function (d) {
      if (d && typeof d === "object") {
        S.quests = Array.isArray(d.quests) ? d.quests : [];
        S.chars = Array.isArray(d.chars) ? d.chars : [];
        S.presets = Array.isArray(d.presets) ? d.presets : [];
      }
      return S;
    });
  }
  var _saveT = 0;
  function save(now) {
    S.at = Date.now();
    if (now) return dbSet("data", S);
    clearTimeout(_saveT);
    _saveT = setTimeout(function () { dbSet("data", S); }, 260);
    return Promise.resolve(true);
  }

  /* ══════════════════════════════════════════════════════════
     2) 台帳（えらべるもの）
     ★ ここは<b>MagiBurst の本体が知っている値</b>にそろえる。
       勝手な名前を作ると、テストプレイのときに render が落ちる。
     ══════════════════════════════════════════════════════════ */
  var ELS = [
    { k: "fire", nm: "火", c: "#ff5d47" }, { k: "water", nm: "水", c: "#38a6ff" },
    { k: "wood", nm: "木", c: "#3ce07a" }, { k: "light", nm: "光", c: "#ffd257" },
    { k: "dark", nm: "闇", c: "#a06bff" },
  ];
  function elc(k) { for (var i = 0; i < ELS.length; i++) if (ELS[i].k === k) return ELS[i].c; return "#8fa8d8"; }
  function eln(k) { for (var i = 0; i < ELS.length; i++) if (ELS[i].k === k) return ELS[i].nm; return "—"; }

  /* 敵の見た目（mb-core の sp）。ここに無い名前を書くと絵が出ない。 */
  var SPS = [
    { k: "ultra", nm: "ウルトラ" }, { k: "omega", nm: "オメガ" }, { k: "zenos", nm: "ゼノス" },
    { k: "valga", nm: "ヴァルガ" }, { k: "astraea", nm: "アストレア" },
    { k: "hecatia", nm: "ヘカーティア" }, { k: "rezelia", nm: "レゼリア" },
  ];
  /* 種族（キラーの対象になる） */
  var RACES = [
    { k: "", nm: "なし" }, { k: "judge", nm: "天律族" }, { k: "hourai", nm: "蓬莱族" },
    { k: "nether", nm: "冥花種" }, { k: "eclipse", nm: "蝕魔族" }, { k: "verde", nm: "VERDE" },
  ];
  /* 敵の行動パターン（mb-core の pattern） */
  var AI = [
    { k: "", nm: "ランダム", d: "近づいて殴る（既定）" },
    { k: "homing", nm: "プレイヤー追尾", d: "いちばん近い味方へ向かう" },
    { k: "near", nm: "最も近いキャラを狙う", d: "毎ターン狙い直す" },
    { k: "fixed", nm: "固定位置", d: "その場から動かない" },
    { k: "laser", nm: "レーザー", d: "十字のレーザー" },
    { k: "crosslaser", nm: "クロスレーザー", d: "ななめ十字のレーザー" },
    { k: "all", nm: "全体攻撃", d: "画面全体へ" },
    { k: "burst", nm: "拡散", d: "拡散弾をばらまく" },
    { k: "custom", nm: "カスタム（ターンごと）", d: "下の「ターンごとの行動」で決める" },
  ];
  /* ターンごとに指定できる行動 */
  var ACTS = [
    { k: "move", nm: "移動" }, { k: "melee", nm: "殴る" }, { k: "laser", nm: "レーザー" },
    { k: "all", nm: "全体攻撃" }, { k: "burst", nm: "拡散" }, { k: "homing", nm: "追尾弾" },
    { k: "summon", nm: "召喚" }, { k: "defup", nm: "防御アップ" }, { k: "atkup", nm: "攻撃アップ" },
    { k: "heal", nm: "自己回復" }, { k: "wait", nm: "なにもしない" },
  ];
  /* 攻撃エディタの攻撃タイプ */
  var ATKS = [
    { k: "line", nm: "直線攻撃" }, { k: "circle", nm: "円形攻撃" }, { k: "spread", nm: "拡散攻撃" },
    { k: "homing", nm: "追尾攻撃" }, { k: "laser", nm: "レーザー" }, { k: "bullet", nm: "弾" },
    { k: "boom", nm: "爆発" }, { k: "all", nm: "全体攻撃" }, { k: "random", nm: "ランダム攻撃" },
    { k: "custom", nm: "カスタム攻撃" },
  ];
  var AILMENTS = [
    { k: "", nm: "なし" }, { k: "poison", nm: "毒" }, { k: "defdown", nm: "防御ダウン" },
    { k: "slow", nm: "行動ターン遅延" }, { k: "atkdown", nm: "攻撃ダウン" }, { k: "seal", nm: "封印" },
  ];
  /* 置けるもの（画面案の「オブジェクト種類」） */
  var OBJS = [
    { k: "spawn", nm: "プレイヤー開始位置", ic: "🎯", c: "#7cb3ff", w: 60, h: 60, round: 1 },
    { k: "enemy", nm: "敵キャラクター", ic: "👾", c: "#ff6f8b", w: 88, h: 88, round: 1 },
    { k: "boss", nm: "ボス", ic: "👑", c: "#ff4d6d", w: 150, h: 150, round: 1 },
    { k: "wall", nm: "壁", ic: "🧱", c: "#8b6b4a", w: 200, h: 40 },
    { k: "block", nm: "ブロック", ic: "⬛", c: "#5a6a8a", w: 120, h: 40 },
    { k: "floor", nm: "床", ic: "▦", c: "#3f5a86", w: 180, h: 120 },
    { k: "obstacle", nm: "障害物", ic: "⛰", c: "#6b7a99", w: 90, h: 90 },
    { k: "gimmick", nm: "ギミック", ic: "⚙", c: "#a06bff", w: 90, h: 90, round: 1 },
    { k: "item", nm: "アイテム", ic: "🎁", c: "#ffd257", w: 60, h: 60 },
    { k: "heal", nm: "回復アイテム", ic: "💚", c: "#3ce07a", w: 60, h: 60, round: 1 },
    { k: "switch", nm: "スイッチ", ic: "🔘", c: "#38a6ff", w: 68, h: 68, round: 1 },
    { k: "trigger", nm: "トリガー", ic: "⚡", c: "#ffb04a", w: 120, h: 120 },
    { k: "fx", nm: "エフェクト発生地点", ic: "✨", c: "#8affc4", w: 70, h: 70, round: 1 },
    { k: "spawner", nm: "敵召喚地点", ic: "🌀", c: "#ff8ab5", w: 78, h: 78, round: 1 },
    { k: "special", nm: "特殊オブジェクト", ic: "◈", c: "#c9b4ff", w: 80, h: 80 },
  ];
  function objDef(k) { for (var i = 0; i < OBJS.length; i++) if (OBJS[i].k === k) return OBJS[i]; return OBJS[0]; }

  /* ギミック（mb-core の gim のキー） */
  var GIMS = [
    { k: "grav", nm: "重力バリア", g: "重力系" }, { k: "warp", nm: "ワープ", g: "ワープ系" },
    { k: "dw", nm: "ダメージウォール", g: "ダメージゾーン" }, { k: "mine", nm: "地雷", g: "ダメージゾーン" },
    { k: "slowwall", nm: "減速壁", g: "移動制限" }, { k: "block", nm: "撃種限定ブロック", g: "移動制限" },
    { k: "lockzone", nm: "ロックゾーン", g: "移動制限" }, { k: "ward", nm: "断絶界", g: "特殊床" },
    { k: "ghost", nm: "透明パネル", g: "特殊床" }, { k: "swap", nm: "撃種変化パネル", g: "特殊床" },
    { k: "photon", nm: "エーテル", g: "特殊床" }, { k: "healwall", nm: "回復ゾーン", g: "回復ゾーン" },
    { k: "countboost", nm: "カウントブースト", g: "攻撃強化ゾーン" },
    { k: "wallchange", nm: "ウォールチェンジ", g: "特殊床" },
    { k: "balloon", nm: "バルーン", g: "召喚装置" }, { k: "vanish", nm: "バニッシュ", g: "時限ギミック" },
    { k: "crush", nm: "クラッシュ", g: "時限ギミック" }, { k: "fbdelay", nm: "FBディレイ", g: "状態異常ギミック" },
    { k: "ghostswitch", nm: "ゴーストスイッチ", g: "スイッチ" },
  ];
  /* イベントの条件（IF） */
  var IFS = [
    { k: "kill", nm: "敵を撃破", v: "敵の番号（1〜）" },
    { k: "left", nm: "敵の残数", v: "残り何体になったら" },
    { k: "hp", nm: "チームHP", v: "何%を下回ったら" },
    { k: "bosshp", nm: "ボスのHP", v: "何%を下回ったら" },
    { k: "turn", nm: "ターン数", v: "何ターン目" },
    { k: "area", nm: "プレイヤーが特定エリアに入る", v: "エリア（オブジェクトの番号）" },
    { k: "gimtouch", nm: "ギミック接触", v: "ギミックのキー" },
    { k: "switch", nm: "スイッチ状態", v: "スイッチの番号" },
    { k: "exist", nm: "特定キャラクターの存在", v: "敵の番号" },
    { k: "dead", nm: "特定キャラクターの撃破", v: "敵の番号" },
    { k: "time", nm: "時間経過", v: "秒" },
    { k: "wavestart", nm: "WAVE開始", v: "—" },
    { k: "waveend", nm: "WAVE終了", v: "—" },
  ];
  /* イベントの実行内容（THEN） */
  var THENS = [
    { k: "summon", nm: "敵を召喚", v: "何体" },
    { k: "gimon", nm: "ギミックを発動", v: "ギミックのキー" },
    { k: "gimoff", nm: "ギミックを解除", v: "ギミックのキー" },
    { k: "buff", nm: "敵を強化", v: "倍率（1.5 など）" },
    { k: "debuff", nm: "敵の防御力ダウン", v: "ターン数" },
    { k: "damage", nm: "プレイヤーにダメージ", v: "ダメージ量" },
    { k: "heal", nm: "チームHPを回復", v: "割合（0.2 で20%）" },
    { k: "special", nm: "特殊攻撃", v: "倍率" },
    { k: "bgm", nm: "BGMを変更", v: "BGM名" },
    { k: "msg", nm: "メッセージを出す", v: "文章" },
    { k: "nextwave", nm: "次のWAVEへ", v: "—" },
  ];
  /* WAVE の終了条件 */
  var ENDS = [
    { k: "all", nm: "敵を全滅" }, { k: "boss", nm: "ボス撃破" },
    { k: "turn", nm: "指定ターン経過" }, { k: "gim", nm: "特定ギミック解除" },
    { k: "event", nm: "特定イベント完了" },
  ];
  var BGS = [
    { k: 1, nm: "王城 A" }, { k: 2, nm: "王城 B" }, { k: 3, nm: "迷宮" },
    { k: 4, nm: "庭園" }, { k: 5, nm: "蓬莱" }, { k: 6, nm: "天空の神殿" },
  ];
  var BGMS = ["自動", "battle1", "battle2", "boss", "judge", "hourai", "garden"];

  /* ══════════════════════════════════════════════════════════
     3) データのひな型
     ══════════════════════════════════════════════════════════ */
  function newEnemy(o) {
    return Object.assign({
      oid: uid("e"), kind: "enemy", nm: "敵", el: "fire", sp: "valga", race: "",
      hp: 500000, atk: 12000, def: 0, spd: 200, r: 44, weight: 50, cd: 2,
      x: 0.5, y: 0.3, w: 88, h: 88, rot: 0, size: 100,
      boss: 0, weak: 0, weakMul: 3.0, wside: "", resist: [], onDeath: "none",
      ai: "", aiTarget: "", turns: [], loop: 1, attacks: [], img: "",
    }, o || {});
  }
  function newObject(kind, x, y) {
    var d = objDef(kind);
    if (kind === "enemy" || kind === "boss") {
      return newEnemy({ kind: kind, x: x, y: y, boss: kind === "boss" ? 1 : 0,
        r: kind === "boss" ? 100 : 44, w: d.w, h: d.h,
        nm: kind === "boss" ? "ボス" : "敵",
        hp: kind === "boss" ? 20000000 : 500000, weak: kind === "boss" ? 1 : 0 });
    }
    return { oid: uid("o"), kind: kind, nm: d.nm, x: x, y: y, w: d.w, h: d.h, rot: 0, size: 100,
      gim: "grav", val: 1, dmg: 3000, target: "player", turns: 1, dur: 3,
      cond: "always", breakable: 0, breakCond: "", recond: "", img: "" };
  }
  function newAttack() {
    return { id: uid("a"), type: "line", pow: 15000, mul: 1.0, bullets: 1, range: 5.0,
      area: "line", dir: "aim", speed: 10, homing: 0, pierce: 0, reflect: 0,
      interval: 3.0, dur: 2.0, target: "all", ailment: "", extra: "" };
  }
  function newWave(n) {
    return { n: n, objs: [], gims: [], events: [], end: { k: "all", v: 0 }, next: 0,
      bg: 0, note: "" };
  }
  function newQuest() {
    return {
      id: uid("q"), v: 1, nm: "新しいクエスト", desc: "", diff: 4, stamina: 20, timeLimit: 180,
      waveN: 3, bg: 1, bgKey: "", bgm: "自動", clear: "敵を全滅させる", lose: "味方の全滅",
      fav: 0, at: nowText(), waves: [newWave(1), newWave(2), newWave(3),
        newWave(4), newWave(5), newWave(6)],
    };
  }
  function newChar() {
    return { id: uid("c"), nm: "オリジナルキャラ", el: "fire", shot: "pierce", img: "",
      hp: 8000, atk: 4200, spd: 320, lv: 80, abil: "", fs: "", ss: "", ssLv: 1, note: "" };
  }
  function newPreset() {
    return { id: uid("p"), nm: "テスト条件", party: [], mode: "max", lv: 80,
      hpP: 100, atkP: 100, spdP: 100, abil: 1, gear: 1, startWave: 1 };
  }

  /* ══════════════════════════════════════════════════════════
     4) MBQ → MagiBurst のステージへ変換（テストプレイ・エクスポート共通）
     ------------------------------------------------------------
     ★ ここが<b>「絵ではなく実際に動くステージ」</b>の心臓。
       エディタの持ちものを、mb-core.js の STAGES とまったく同じ形へ写す。
     ★ 形をまちがえると render ごと落ちる（ギミックの値は「数だけ」「オブジェクト」と
       決まっているものがある）ので、必ずこの関数を通すこと。
     ══════════════════════════════════════════════════════════ */
  function toStage(q, opt) {
    opt = opt || {};
    var waves = [], gimByWave = [], blocks = [], ghost = [], swap = [];
    var useN = clamp(q.waveN | 0, 1, 6);
    for (var w = 0; w < useN; w++) {
      var wv = q.waves[w] || newWave(w + 1);
      var defs = [];
      (wv.objs || []).forEach(function (o) {
        if (o.kind === "enemy" || o.kind === "boss") {
          var d = {
            el: o.el || "fire", sp: o.sp || "valga",
            hp: Math.max(1, Math.round(o.hp || 1)),
            atk: Math.max(0, Math.round(o.atk || 0)),
            cd: clamp(o.cd | 0 || 2, 1, 9),
            r: Math.max(14, Math.round((o.r || 44) * (o.size || 100) / 100)),
            x: clamp(o.x, 0.04, 0.96), y: clamp(o.y, 0.04, 0.72),
          };
          if (o.boss) d.boss = 1;
          if (o.weak) d.weak = 1;
          if (o.wside) d.wside = o.wside;
          if (o.race === "judge") d.judge = 1;
          if (o.nm) d.nm = o.nm;
          /* 行動パターン。custom のときは turns をそのまま持たせる（下の runtime が読む） */
          if (o.ai === "custom") { d.pattern = "all"; d.mbcTurns = (o.turns || []).slice(); d.mbcLoop = o.loop ? 1 : 0; }
          else if (o.ai) d.pattern = o.ai;
          if (o.attacks && o.attacks.length) d.mbcAtk = o.attacks.slice();
          if (o.img) d.mbcImg = o.img;
          if (o.spd) d.mbcSpd = o.spd;
          if (o.def) d.mbcDef = o.def;
          if (o.weight) d.mbcWeight = o.weight;
          if (o.weakMul) d.mbcWeakMul = o.weakMul;
          if (o.resist && o.resist.length) d.mbcResist = o.resist.slice();
          if (o.onDeath && o.onDeath !== "none") d.mbcDeath = o.onDeath;
          defs.push(d);
        } else if (o.kind === "wall" || o.kind === "block" || o.kind === "obstacle") {
          /* ブロックは「割合の四角」で持つ（mb-core の blocks と同じ形） */
          blocks.push({ x: clamp(o.x - (o.w / 2) / W, 0, 1), y: clamp(o.y - (o.h / 2) / H, 0, 1),
            w: clamp(o.w / W, 0.02, 1), h: clamp(o.h / H, 0.01, 1),
            kind: o.kind === "block" ? (o.val === 2 ? "pierce" : o.val === 1 ? "bounce" : "") : "" });
        } else if (o.kind === "floor") {
          ghost.push({ x: clamp(o.x - (o.w / 2) / W, 0, 1), y: clamp(o.y - (o.h / 2) / H, 0, 1),
            w: clamp(o.w / W, 0.02, 1), h: clamp(o.h / H, 0.01, 1) });
        } else if (o.kind === "special") {
          swap.push({ x: clamp(o.x, 0, 1), y: clamp(o.y, 0, 1), r: 0.05 });
        }
      });
      if (!defs.length) {
        /* 敵が1体もいないと buildBattle が空のWAVEを作って進まなくなる。保険を1体置く。 */
        defs.push({ el: "fire", sp: "valga", hp: 100000, atk: 8000, cd: 2, r: 44, x: .5, y: .28 });
      }
      waves.push(defs);
      gimByWave.push(gimOfWave(wv));
    }
    var st = {
      id: opt.id || ("mbc_" + q.id),
      nm: q.nm || "オリジナルクエスト",
      room: 1, diff: "★" + clamp(q.diff | 0 || 4, 1, 10),
      gold: 500, orb: 0, exp: 200,
      bg: clamp(q.bg | 0 || 1, 1, 6),
      gim: gimByWave[0] || {},
      gimByWave: gimByWave,
      blocks: blocks, ghost: ghost, swap: swap,
      desc: q.desc || "オリジナルクエスト（ステージエディターで作成）",
      waves: waves,
      mbc: 1,                      /* ★ 目じるし。テストプレイの後始末で使う */
      mbcQuest: q.id,
      mbcTime: q.timeLimit | 0,
      mbcClear: q.clear || "",
      mbcLose: q.lose || "",
      mbcEnds: q.waves.slice(0, useN).map(function (x) { return x.end || { k: "all", v: 0 }; }),
      mbcEvents: q.waves.slice(0, useN).map(function (x) { return (x.events || []).slice(); }),
    };
    return st;
  }
  /* WAVE の gim（mb-core の形にそろえる。値の形は種類ごとに決まっている） */
  function gimOfWave(wv) {
    var g = {};
    (wv.gims || []).forEach(function (x) {
      var k = x.k, v = num(x.v, 1), dmg = Math.max(0, Math.round(num(x.dmg, 3000)));
      if (k === "dw") g.dw = { sides: x.sides && x.sides.length ? x.sides.slice() : ["left", "right"], dmg: dmg };
      else if (k === "slowwall") g.slowwall = { sides: x.sides && x.sides.length ? x.sides.slice() : ["top", "bottom"] };
      else if (k === "mine") g.mine = { n: clamp(v | 0 || 3, 1, 9), dmg: dmg };
      else if (k === "warp") g.warp = clamp(v | 0 || 2, 1, 8);
      else if (k === "block") g.block = 1;
      else if (k === "lockzone") g.lockzone = { n: clamp(v | 0 || 1, 1, 5) };
      else if (k === "ward") g.ward = { n: clamp(v | 0 || 1, 1, 4), hits: clamp(num(x.dur, 3) | 0, 1, 9) };
      else if (k === "photon") g.photon = { n: clamp(v | 0 || 2, 1, 6), need: clamp(v | 0 || 2, 1, 6) };
      else if (k === "grav") g.grav = clamp(v | 0 || 120, 40, 400);
      else g[k] = v ? v : 1;       /* そのほかは「数だけ」の形 */
    });
    return g;
  }

  /* ══════════════════════════════════════════════════════════
     5) エクスポート
     ------------------------------------------------------------
     ① MBQ の JSON      … このエディタで読み書きする形（再読み込みできる）
     ② STAGES 用のコード … mb-core.js にそのまま貼れる形
     ★ どちらも<b>ダウンロードフォルダに保存</b>できる。
       Claude には「Downloads の ◯◯.json を使って」と言えば渡せる。
     ══════════════════════════════════════════════════════════ */
  function download(name, text, mime) {
    try {
      var b = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
      var u = URL.createObjectURL(b);
      var a = document.createElement("a");
      a.href = u; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      return true;
    } catch (e) { return false; }
  }
  function safeName(s) {
    return String(s || "quest").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40) || "quest";
  }
  function exportJson(q) {
    return JSON.stringify({ format: "MagiBurst-Quest", v: 1, at: nowText(), quest: q,
      chars: S.chars, presets: S.presets }, null, 1);
  }
  /* mb-core.js の STAGES に貼れるコード */
  function exportCode(q) {
    var st = toStage(q, { id: "mbc_" + safeName(q.nm) });
    function j(v) { return JSON.stringify(v); }
    var L = [];
    L.push("/* ══════════════════════════════════════════════════════════════");
    L.push("   " + q.nm + " — ステージエディター（MB613Create26）で作ったクエスト");
    L.push("   書き出し: " + nowText());
    L.push("   ★ そのまま STAGES / 専用の配列へ push すれば動く形にしてある。");
    L.push("     ・waves … WAVEごとの敵の定義（x,y は 0〜1 の割合）");
    L.push("     ・gimByWave … WAVEごとのギミック（値の形は種類ごとに決まっている）");
    L.push("     ・blocks / ghost / swap … 地形（割合の四角）");
    L.push("   ══════════════════════════════════════════════════════════════ */");
    L.push("const MBC_" + safeName(q.nm).toUpperCase().replace(/[^A-Z0-9_]/g, "_") + " = {");
    L.push("  id: " + j(st.id) + ", nm: " + j(st.nm) + ", diff: " + j(st.diff) + ",");
    L.push("  bg: " + st.bg + ", gold: " + st.gold + ", orb: " + st.orb + ", exp: " + st.exp + ",");
    L.push("  desc: " + j(st.desc) + ",");
    L.push("  blocks: " + j(st.blocks) + ",");
    L.push("  ghost: " + j(st.ghost) + ",");
    L.push("  swap: " + j(st.swap) + ",");
    L.push("  gim: " + j(st.gim) + ",");
    L.push("  gimByWave: " + j(st.gimByWave) + ",");
    L.push("  waves: [");
    st.waves.forEach(function (wv, i) {
      L.push("    /* WAVE " + (i + 1) + " */");
      L.push("    [" + wv.map(function (d) { return j(d); }).join(",\n     ") + "],");
    });
    L.push("  ],");
    L.push("};");
    L.push("");
    L.push("/* ── 参考: WAVEの終了条件とイベント（エディタ側の設定。engine には直に効きません） ── */");
    L.push("/* ends:   " + JSON.stringify(st.mbcEnds) + " */");
    L.push("/* events: " + JSON.stringify(st.mbcEvents) + " */");
    return L.join("\n");
  }

  /* ══════════════════════════════════════════════════════════
     6) 画面
     ══════════════════════════════════════════════════════════ */
  var V = { page: "home", qid: null, wave: 0, sel: null, tool: "enemy",
            layers: { bg: 1, stage: 1, gim: 1, enemy: 1, boss: 1, player: 1, fx: 1 },
            locks: {}, preset: null, testWave: 1 };

  function curQ() { for (var i = 0; i < S.quests.length; i++) if (S.quests[i].id === V.qid) return S.quests[i]; return null; }
  function curW() { var q = curQ(); return q ? (q.waves[V.wave] || q.waves[0]) : null; }

  function ensureRoot() {
    if (el("mbcRoot")) return;
    var d = document.createElement("div");
    d.id = "mbcRoot";
    d.innerHTML =
      '<div class="mbc-top">' +
        '<button class="mbc-ico" id="mbcBack" title="もどる">‹</button>' +
        '<div class="tt" id="mbcTitle">ステージエディター<small>MagiBurst クエスト作成</small></div>' +
        '<button class="mbc-ico" id="mbcHelp" title="つかいかた">?</button>' +
      "</div>" +
      '<div class="mbc-body" id="mbcBody"></div>' +
      '<nav class="mbc-nav" id="mbcNav">' +
        '<button data-p="home"><i>🏠</i>ホーム</button>' +
        '<button data-p="list"><i>📋</i>クエスト</button>' +
        '<button data-p="chars"><i>🧑</i>キャラ</button>' +
        '<button data-p="gallery"><i>🖼</i>素材</button>' +
        '<button data-p="settings"><i>⚙</i>設定</button>' +
      "</nav>";
    document.body.appendChild(d);
    d.querySelector("#mbcBack").onclick = function () { back(); };
    d.querySelector("#mbcHelp").onclick = function () { openHelp(); };
    d.querySelectorAll("#mbcNav button").forEach(function (b) {
      b.onclick = function () { go(b.getAttribute("data-p")); };
    });

    var sh = document.createElement("div");
    sh.className = "mbc-sheet"; sh.id = "mbcSheet";
    sh.innerHTML = '<div class="mbc-sheet-card" id="mbcSheetCard"></div>';
    sh.onclick = function (e) { if (e.target === sh) closeSheet(); };
    document.body.appendChild(sh);

    var db = document.createElement("div");
    db.className = "mbc-debug"; db.id = "mbcDebug";
    document.body.appendChild(db);
    var fab = document.createElement("button");
    fab.className = "mbc-dbgfab"; fab.id = "mbcDbgFab"; fab.textContent = "🐞";
    fab.onclick = function () { el("mbcDebug").classList.toggle("on"); };
    document.body.appendChild(fab);
  }

  function openSheet(html) {
    ensureRoot();
    el("mbcSheetCard").innerHTML = html;
    el("mbcSheet").classList.add("on");
  }
  function closeSheet() { var s = el("mbcSheet"); if (s) s.classList.remove("on"); }

  function go(p) {
    V.page = p;
    var nav = el("mbcNav");
    if (nav) nav.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-p") === p);
    });
    render();
  }
  function back() {
    if (V.page === "edit" || V.page === "stage" || V.page === "test") { go("list"); return; }
    if (V.page !== "home") { go("home"); return; }
    close();
  }

  function setTitle(t, s) {
    var e = el("mbcTitle");
    if (e) e.innerHTML = esc(t) + (s ? "<small>" + esc(s) + "</small>" : "");
  }

  window.MBCreate = {
    open: openGate, close: close, _S: S,
    toStage: toStage, exportJson: exportJson, exportCode: exportCode,
  };

  /* ══ アクセスコード ══ */
  var _openTo = null;
  function openGate(page) {
    _openTo = page || null;
    var ok = false;
    try { ok = localStorage.getItem(OK_KEY) === "1"; } catch (e) {}
    if (ok) return openEditor();
    var g = el("mbcGate");
    if (!g) {
      g = document.createElement("div");
      g.className = "mbc-gate"; g.id = "mbcGate";
      g.innerHTML = '<div class="mbc-gate-card">' +
        "<b>🔑 アクセスコード</b>" +
        "<small>クエスト作成（ステージエディター）は<b>アクセスコード</b>が要ります。<br>" +
        "コードをお持ちの方は入力してください。</small>" +
        '<input class="mbc-in" id="mbcGateIn" placeholder="コードを入力" autocomplete="off">' +
        '<div class="err" id="mbcGateErr"></div>' +
        '<div class="mbc-btns"><button class="mbc-btn" id="mbcGateNo">とじる</button>' +
        '<button class="mbc-btn pri" id="mbcGateGo">開く</button></div></div>';
      document.body.appendChild(g);
      g.querySelector("#mbcGateNo").onclick = function () { g.classList.remove("on"); };
      g.querySelector("#mbcGateGo").onclick = function () {
        var v = (el("mbcGateIn").value || "").trim();
        if (v === ACCESS_CODE) {
          try { localStorage.setItem(OK_KEY, "1"); } catch (e) {}
          g.classList.remove("on"); openEditor();
        } else {
          el("mbcGateErr").textContent = "コードがちがいます";
        }
      };
      g.querySelector("#mbcGateIn").addEventListener("keydown", function (e) {
        if (e.key === "Enter") g.querySelector("#mbcGateGo").click();
      });
    }
    g.classList.add("on");
    setTimeout(function () { var i = el("mbcGateIn"); if (i) i.focus(); }, 60);
  }

  function openEditor() {
    ensureRoot();
    load().then(function () {
      el("mbcRoot").classList.add("on");
      try { document.body.style.overflow = "hidden"; } catch (e) {}
      /* ★ 戻り先を指定されていたらそこへ（デバッグメニューの「編集画面へ戻る」）。
         load() は非同期なので、呼び出し側で go() してもここに上書きされてしまう。 */
      go(_openTo || "home");
      _openTo = null;
    });
  }
  function close() {
    var r = el("mbcRoot"); if (r) r.classList.remove("on");
    closeSheet();
    try { document.body.style.overflow = ""; } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════════
     ここから下は「画面ごとの描きかた」。render() が page で振り分ける。
     ══════════════════════════════════════════════════════════ */
  /* ★ 画面の中身は mb-create-ui.js / mb-create-test.js が
     MBCreate.render○Impl として入れる。ここは振り分けるだけ。
     ★ まだ読まれていない（遅延読み込みの途中）ときは何も出さない。 */
  function render() {
    var b = el("mbcBody"); if (!b) return;
    b.scrollTop = 0;
    var f = window.MBCreate["render" + V.page.charAt(0).toUpperCase() + V.page.slice(1) + "Impl"];
    if (typeof f === "function") { f(b); return; }
    b.innerHTML = '<div class="mbc-note">読みこみ中…</div>';
  }
  window.MBCreate.render = render;
  window.MBCreate.go = go;
  window.MBCreate._V = V;
  window.MBCreate._save = save;
  window.MBCreate._curQ = curQ;
  window.MBCreate._curW = curW;
  window.MBCreate._newQuest = newQuest;
  window.MBCreate._newWave = newWave;
  window.MBCreate._newObject = newObject;
  window.MBCreate._newAttack = newAttack;
  window.MBCreate._newChar = newChar;
  window.MBCreate._newPreset = newPreset;
  window.MBCreate._tables = { ELS: ELS, SPS: SPS, RACES: RACES, AI: AI, ACTS: ACTS, ATKS: ATKS,
    AILMENTS: AILMENTS, OBJS: OBJS, GIMS: GIMS, IFS: IFS, THENS: THENS, ENDS: ENDS, BGS: BGS, BGMS: BGMS };
  window.MBCreate._u = { el: el, esc: esc, uid: uid, clamp: clamp, num: num, toast: toast, ask: ask,
    openSheet: openSheet, closeSheet: closeSheet, setTitle: setTitle, objDef: objDef,
    elc: elc, eln: eln, download: download, safeName: safeName, nowText: nowText, W: W, H: H };
})();
