/* ══════════════════════════════════════════════════════════════
   MagiDiamond 最新版 — 選手データの台帳
   ------------------------------------------------------------
   ★★ 2026-08-30 大幅リニューアル（ご指定）
     ・選手は <b>XEVARION に実装されている SR・SSR の全キャラクター</b>。
       このアプリの中に<b>キャラクターのガチャは作らない</b>——
       手に入れるのは XEVARION のガチャ、ここは「育てて・組んで・戦う」だけ。
     ・野球の能力は<b>MagiBurst のキャラクターデータから自動で作る</b>。
       187体ぶんを手で書くと、キャラが増えるたびに書き足しが要るうえ、
       必ずどこかで抜ける。<b>式ひとつ</b>にしておけば、
       新しいキャラが増えた日から自動で選手として使える。

   ★ 強さの決めごと（ご指定）
       ① SR より SSR が強い
       ② SSR は<b>No. が新しいほど</b>強い
       ③ <b>極彩祭・極華祭・極煌祭・戦姫祭</b>のキャラがいちばん強い
     この3つを MD_TIER（下）で1か所にまとめてある。数字を変えるならここだけ。

   ★ 同じキャラなら<b>いつ開いても同じ能力</b>になること。
     そのために乱数は使わず、<b>id から作るハッシュ</b>でばらつきを付けている。

   ★ 読み込みの順番
       ① md2-mb.js（この下の loadMbCore）で mb-core.js を読む
       ② MD2DATA.build() で全選手を作る
     MagiDiamond は XEVARION の1つ下にあるので、mb-core.js の画像フォルダの
     既定値（"../img/"）がそのまま正しい。mb-boot.js は使わない
     （あちらはポータル直下用に "img/" を決め打ちするため）。
   ══════════════════════════════════════════════════════════════ */
(function () {
"use strict";

/* ══════════ mb-core.js を読むための最小限の土台 ══════════
   mb-core.js は MagiBurst の画面まわり（$ / DB / clamp / fmt / B / sleep）を
   当てにして書かれている。ここに無いと statsOf() などが例外で落ちる。 */
function mbShim() {
  if (typeof window.$ !== "function") window.$ = function (q) { return document.querySelector(q); };
  if (typeof window.clamp !== "function") window.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  if (typeof window.fmt !== "function") window.fmt = function (n) { return (Number(n) || 0).toLocaleString("ja-JP"); };
  if (typeof window.sleep !== "function") window.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  if (!("B" in window)) window.B = null;
  if (!window.DB) {
    var db = null;
    try { db = JSON.parse(localStorage.getItem("magiburst_v1") || "null"); } catch (e) {}
    if (!db || typeof db !== "object") db = {};
    ["chars", "items", "hero", "trans", "jade", "fruits", "equip", "equip2", "equip3",
     "fav", "crossBook", "arc", "emblem", "lend"].forEach(function (k) { if (!db[k]) db[k] = {}; });
    if (!Array.isArray(db.party)) db.party = [];
    window.DB = db;
  }
}
var _mbPromise = null;
function loadMbCore() {
  mbShim();
  if (typeof CHARS !== "undefined" && typeof CHAR_IDS !== "undefined") return Promise.resolve();
  if (_mbPromise) return _mbPromise;
  _mbPromise = new Promise(function (res, rej) {
    var s = document.createElement("script");
    s.src = "../MagiBurst/js/mb-core.js?v=68";
    s.onload = function () { res(); };
    s.onerror = function () { _mbPromise = null; rej(new Error("mb-core")); };
    document.head.appendChild(s);
  });
  return _mbPromise;
}

/* ══════════ ばらつきの種（乱数は使わない） ══════════
   同じ id なら必ず同じ値。端末が変わっても、日をまたいでも動かない。 */
function h32(s) {
  var h = 2166136261 >>> 0;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
/* 0〜1 の値。salt を変えると別の軸のばらつきになる */
function seedOf(id, salt) { return (h32(id + "|" + salt) % 100000) / 100000; }
/* −1〜+1 */
function swing(id, salt) { return seedOf(id, salt) * 2 - 1; }

/* ══════════ 強さの段（ご指定の3つをここ1か所で決める） ══════════ */
/* 最強あつかいのガチャ（極彩祭・極華祭・極煌祭・戦姫祭） */
var TOP_FES = ["fes7", "fes8", "fes9", "fes11"];
function MD_TIER(id) {
  var c = (typeof CHARS !== "undefined") ? CHARS[id] : null;
  if (!c) return { rank: "SR", base: 0, label: "SR" };
  var no = (typeof charNo === "function") ? charNo(id) : 999;
  var maxNo = (typeof CHAR_IDS !== "undefined") ? CHAR_IDS.length : 187;
  var ssr = !!c.star5;
  /* ① SR と SSR の段差 */
  var base = ssr ? 12 : 0;
  /* ② SSR は No. が新しいほど強い（0 → +10） */
  if (ssr && no <= maxNo) base += 10 * (Math.max(1, no) / maxNo);
  /* ③ 極彩祭・極華祭・極煌祭・戦姫祭はさらに上（ここがいちばん強い） */
  var top = !!(c.fesKey && TOP_FES.indexOf(c.fesKey) >= 0);
  if (top) base += 10;
  /* ラベル（カードの帯に出す） */
  var label = top ? "LEGEND" : ssr ? "SSR" : "SR";
  return { rank: ssr ? "SSR" : "SR", base: base, label: label, top: top, no: no };
}

/* ══════════ MagiBurst のステータス → 野球の能力 ══════════
   ・MagiBurst の hp / atk / spd（限界まで育てた値）を 0〜1 にならしてから使う。
   ・そのうえで「型」（撃種・属性・持っているアビリティ）で味付けする。
   ★ ここが選手の個性のもと。式を変えると全選手がいっせいに変わる。 */
var REF = { hp: [900, 7000], atk: [480, 3800], spd: [270, 480] };
function norm(v, lo, hi) { return Math.max(0, Math.min(1, (v - lo) / (hi - lo))); }
function statOf(c) {
  var hp = Array.isArray(c.hp) ? c.hp[1] : 3000;
  var atk = Array.isArray(c.atk) ? c.atk[1] : 2000;
  var spd = Array.isArray(c.spd) ? c.spd[1] : 350;
  return {
    hp: norm(hp, REF.hp[0], REF.hp[1]),
    atk: norm(atk, REF.atk[0], REF.atk[1]),
    spd: norm(spd, REF.spd[0], REF.spd[1]),
  };
}
function has(c, t) {
  return !!(c && Array.isArray(c.abil) && c.abil.some(function (a) {
    return a && (a.t === t || String(a.t).indexOf(t) === 0);
  }));
}
function clip(v) { return Math.max(28, Math.min(99, Math.round(v))); }

/* ══════════ 選手1人を作る ══════════ */
function buildPlayer(id) {
  var c = CHARS[id]; if (!c) return null;
  var t = MD_TIER(id), s = statOf(c);
  /* ★ 下地。ここに個性のぶんを足していく。
     t.base は SR 0 ／ SSR 12〜22 ／ 極彩・極華・極煌・戦姫 22〜32。
     0.70 を掛けているのは、能力が 99（上限）に張りつかないようにするため。 */
  var B0 = 36 + t.base * 0.70;
  var pierce = c.shot === "pierce";         /* 貫通＝力型 ／ 反射＝技型 */
  var el = c.el;

  /* ── 野手の能力 ── */
  var meet  = B0 + s.spd * 20 + s.atk * 6  + swing(id, "meet") * 6  + (pierce ? -3 : 5);
  var power = B0 + s.atk * 23 + s.hp * 4   + swing(id, "power") * 6 + (pierce ? 6 : -3);
  var run   = B0 + s.spd * 25              + swing(id, "run") * 6   + (el === "wood" ? 3 : 0);
  var field = B0 + s.hp * 15 + s.spd * 9   + swing(id, "field") * 6 + (el === "water" ? 3 : 0);
  var arm   = B0 + s.atk * 17 + s.hp * 6   + swing(id, "arm") * 6   + (pierce ? 4 : 0);
  var catchS= B0 + s.hp * 18 + s.spd * 5   + swing(id, "catch") * 6 + (el === "light" ? 3 : 0);

  /* アビリティによる味付け（MagiBurst で得意なことが野球にも出る） */
  if (has(c, "dash")) run += 4;
  if (has(c, "aura")) power += 3;
  if (has(c, "sokojikara")) power += 3;
  if (has(c, "weakkiller")) meet += 3;
  if (has(c, "barrier")) catchS += 3;
  if (has(c, "regen")) field += 3;
  if (has(c, "vital")) power += 3;
  if (has(c, "combokiller")) meet += 3;
  if (has(c, "firstkiller")) run += 3;
  if (has(c, "houraikiller")) { power += 2; meet += 2; }

  /* ── 投手の能力 ── */
  var velo  = B0 + s.atk * 23 + s.spd * 5  + swing(id, "velo") * 6  + (pierce ? 7 : -4);
  var heavy = B0 + s.atk * 17 + s.hp * 8   + swing(id, "heavy") * 6;
  var ctrl  = B0 + s.spd * 11 + s.hp * 11  + swing(id, "ctrl") * 6  + (pierce ? -4 : 7);
  var stam  = B0 + s.hp * 23               + swing(id, "stam") * 6;
  var brk   = B0 + s.spd * 15 + s.atk * 6  + swing(id, "brk") * 6   + (pierce ? -5 : 8);
  var mind  = B0 + s.hp * 11 + s.atk * 9   + swing(id, "mind") * 6  + (t.top ? 4 : 0);

  var P = {
    id: id, nm: c.nm, th: c.th, el: el, shot: c.shot, type: c.type,
    rank: t.rank, label: t.label, top: !!t.top, no: t.no,
    /* 野手 */
    meet: clip(meet), power: clip(power), run: clip(run),
    field: clip(field), arm: clip(arm), catch: clip(catchS),
    /* 投手 */
    velo: clip(velo), heavy: clip(heavy), ctrl: clip(ctrl),
    stam: clip(stam), brk: clip(brk), mind: clip(mind),
  };
  P.traj = trajOf(P, id);        /* 弾道 1〜4 */
  P.bat = batTypeOf(P, id);      /* 打撃タイプ */
  P.pitchType = pitchTypeOf(P);  /* 投手タイプ */
  P.role = roleOf(P);            /* 投手向き／野手向き */
  P.pos = posOf(P, id);          /* ポジション適性（S〜G） */
  P.pitches = pitchesOf(P, id);  /* 持ち球 */
  P.skills = skillsOf(P, c, id); /* 固有スキル */
  P.ovr = ovrOf(P);              /* 総合力 */
  return P;
}

/* 弾道（1＝低い〜4＝アーチスト）。パワーと弾道の相性で長打が出やすくなる */
function trajOf(P, id) {
  var v = P.power * 0.6 + P.meet * 0.2 + seedOf(id, "traj") * 40;
  return v > 96 ? 4 : v > 82 ? 3 : v > 68 ? 2 : 1;
}
function batTypeOf(P, id) {
  if (P.power - P.meet >= 8) return "パワーヒッター";
  if (P.meet - P.power >= 8) return "アベレージヒッター";
  if (P.run >= 80) return "リードオフ";
  return "バランス";
}
function pitchTypeOf(P) {
  if (P.velo - P.ctrl >= 8) return "剛速球";
  if (P.ctrl - P.velo >= 8) return "技巧派";
  if (P.brk >= 80) return "変化球";
  return "オールラウンド";
}
function roleOf(P) {
  var pit = (P.velo + P.ctrl + P.brk + P.stam) / 4;
  var bat = (P.meet + P.power + P.run + P.field) / 4;
  return pit - bat >= 4 ? "投手" : bat - pit >= 4 ? "野手" : "二刀流";
}
/* ポジション適性。守備・肩・走力・捕球と、id のばらつきで決める。
   ★ ひとりに S を1つだけ作って「本職」がはっきり分かるようにする。 */
var POS = ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "左翼手", "中堅手", "右翼手"];
/* ★ 実測して調整。能力の帯を下げたので、こちらの段も合わせる。
   全部 S になってしまうと「本職がどこか」が読めなくなる。 */
function gradeOf(v) { return v >= 86 ? "S" : v >= 78 ? "A" : v >= 70 ? "B" : v >= 62 ? "C" : v >= 54 ? "D" : v >= 46 ? "E" : v >= 38 ? "F" : "G"; }
function posOf(P, id) {
  var sc = {
    "投手": (P.velo + P.ctrl + P.stam + P.brk) / 4,
    "捕手": (P.catch * 1.5 + P.arm + P.field) / 3.5,
    "一塁手": (P.catch + P.field * 0.6 + P.power * 0.6) / 2.2,
    "二塁手": (P.field * 1.3 + P.run + P.catch * 0.7) / 3,
    "三塁手": (P.arm * 1.2 + P.field + P.catch * 0.8) / 3,
    "遊撃手": (P.field * 1.4 + P.arm + P.run * 0.8) / 3.2,
    "左翼手": (P.field * 0.8 + P.run + P.power * 0.6) / 2.4,
    "中堅手": (P.run * 1.4 + P.field + P.catch * 0.6) / 3,
    "右翼手": (P.arm * 1.3 + P.run * 0.8 + P.field * 0.7) / 2.8,
  };
  /* id ごとの好み（同じ能力でも本職がばらけるように） */
  var pref = Math.floor(seedOf(id, "pos") * POS.length);
  var out = {};
  POS.forEach(function (p, i) {
    var v = sc[p] + (i === pref ? 12 : 0) + swing(id, "pos" + i) * 5;
    out[p] = gradeOf(v);
  });
  /* 投手向きなら投手を必ず A 以上にする（本職がないと編成が組めない） */
  if (P.role === "投手" && "SAB".indexOf(out["投手"]) < 0) out["投手"] = "A";
  if (P.role === "野手" && out["投手"] === "S") out["投手"] = "B";
  return out;
}
/* 持ち球（投手として使うときの球種）。ストレートは全員。 */
var PITCH_ALL = [
  { k: "straight", nm: "ストレート", c: "#ff5e5e", move: 0 },
  { k: "curve",    nm: "カーブ",     c: "#ffb020", move: 3 },
  { k: "slider",   nm: "スライダー", c: "#3ec27b", move: 2 },
  { k: "fork",     nm: "フォーク",   c: "#5aa9ff", move: 3 },
  { k: "sinker",   nm: "シンカー",   c: "#c88bff", move: 2 },
  { k: "change",   nm: "チェンジアップ", c: "#8fd0ff", move: 1 },
];
function pitchesOf(P, id) {
  var out = [{ k: "straight", lv: Math.max(1, Math.min(5, Math.round(P.velo / 20))) }];
  var rest = PITCH_ALL.slice(1);
  /* 変化量が大きいほど持ち球が多い（2〜5種） */
  var n = P.brk >= 88 ? 4 : P.brk >= 76 ? 3 : P.brk >= 62 ? 2 : 1;
  var start = Math.floor(seedOf(id, "pitch") * rest.length);
  for (var i = 0; i < n; i++) {
    var p = rest[(start + i) % rest.length];
    out.push({ k: p.k, lv: Math.max(1, Math.min(5, Math.round(P.brk / 20) - (i > 1 ? 1 : 0))) });
  }
  return out;
}

/* ══════════ 固有スキル ══════════
   ★ 名前が同じスキルは効果も同じ（MagiBurst と同じ決めごと）。
     ここ1か所に定義して、キャラには<b>キーだけ</b>を持たせる。 */
var SKILLS = {
  /* 打撃 */
  powerstar:   { nm: "POWER STAR",    kind: "bat", c: "#ff5e5e", desc: "強振したときの打球速度が上がる（長打が出やすい）", bat: { hard: 0.12 } },
  widehit:     { nm: "WIDE HITTER",   kind: "bat", c: "#3ec27b", desc: "コースを読みちがえたときの当たりぐあいが下がりにくい", bat: { miss: 0.15 } },
  chancemaker: { nm: "CHANCE MAKER",  kind: "bat", c: "#ffd257", desc: "走者がいるとき、ミートが上がる", bat: { runnerMeet: 8 } },
  clutchbat:   { nm: "CLUTCH SWING",  kind: "bat", c: "#ff9d2e", desc: "7回以降、パワーが上がる", bat: { lateP: 8 } },
  stickyhit:   { nm: "STICKY",        kind: "bat", c: "#8fd0ff", desc: "2ストライクからファウルで粘りやすい", bat: { foul: 0.18 } },
  archist:     { nm: "ARCHIST",       kind: "bat", c: "#c88bff", desc: "弾道が1段上がる（打球が高く上がる）", bat: { traj: 1 } },
  /* 走塁 */
  flashstep:   { nm: "FLASH STEP",    kind: "run", c: "#5aa9ff", desc: "盗塁の成功率が上がる", run: { steal: 0.14 } },
  turbo:       { nm: "TURBO",         kind: "run", c: "#3ec27b", desc: "打球のあと、次の塁をねらいやすくなる", run: { extra: 0.16 } },
  slidein:     { nm: "SLIDE IN",      kind: "run", c: "#ffd257", desc: "きわどい判定でセーフになりやすい", run: { close: 0.12 } },
  /* 守備 */
  guardian:    { nm: "GUARDIAN",      kind: "def", c: "#7fd0ff", desc: "捕球できる範囲が広がる", def: { reach: 0.14 } },
  cannonarm:   { nm: "CANNON ARM",    kind: "def", c: "#ff5e5e", desc: "送球が速くなる", def: { throw: 0.15 } },
  ironwall:    { nm: "IRON WALL",     kind: "def", c: "#9fb4e6", desc: "捕球のタイミング判定が広くなる（エラーしにくい）", def: { hands: 0.16 } },
  /* 投手 */
  phantomball: { nm: "PHANTOM BALL",  kind: "pit", c: "#c88bff", desc: "変化球の変化量が上がる", pit: { move: 0.16 } },
  acepitcher:  { nm: "ACE PITCHER",   kind: "pit", c: "#ffd257", desc: "スタミナの減りがゆるやかになる", pit: { stam: 0.20 } },
  strikeout:   { nm: "STRIKE OUT",    kind: "pit", c: "#ff9d2e", desc: "2ストライクからの決め球が強くなる", pit: { finish: 0.14 } },
  pinchguard:  { nm: "PINCH GUARD",   kind: "pit", c: "#5aa9ff", desc: "走者を背負っているときの制球が上がる", pit: { pinch: 8 } },
  heavyball:   { nm: "HEAVY BALL",    kind: "pit", c: "#8b6fd8", desc: "打たれても長打になりにくい", pit: { soft: 0.15 } },
};
/* キャラの性格（属性・撃種・アビリティ）から 2〜3 個えらぶ。
   ★ 上の段（LEGEND）は 3 個、SSR は 3 個、SR は 2 個。 */
function skillsOf(P, c, id) {
  var pool = [];
  if (P.power >= 72) pool.push("powerstar");
  if (P.meet >= 72) pool.push("widehit");
  if (P.run >= 72) pool.push("flashstep");
  if (P.field >= 72) pool.push("guardian");
  if (P.arm >= 72) pool.push("cannonarm");
  if (P.catch >= 72) pool.push("ironwall");
  if (P.brk >= 72) pool.push("phantomball");
  if (P.stam >= 72) pool.push("acepitcher");
  if (P.ctrl >= 72) pool.push("pinchguard");
  if (P.velo >= 72) pool.push("strikeout");
  if (P.traj >= 3) pool.push("archist");
  if (has(c, "sokojikara")) pool.push("clutchbat");
  if (has(c, "weakkiller")) pool.push("chancemaker");
  if (has(c, "dash")) pool.push("turbo");
  if (has(c, "barrier")) pool.push("heavyball");
  if (has(c, "regen")) pool.push("slidein");
  if (has(c, "combokiller")) pool.push("stickyhit");
  /* 足りなければ id から決まる順で埋める（必ず同じ結果になる） */
  var all = Object.keys(SKILLS);
  var st = Math.floor(seedOf(id, "skill") * all.length);
  for (var i = 0; i < all.length && pool.length < 6; i++) {
    var k = all[(st + i) % all.length];
    if (pool.indexOf(k) < 0) pool.push(k);
  }
  var n = P.top ? 3 : P.rank === "SSR" ? 3 : 2;
  /* 重複を除いて先頭から n 個 */
  var out = [], seen = {};
  for (var j = 0; j < pool.length && out.length < n; j++) {
    if (seen[pool[j]]) continue; seen[pool[j]] = 1; out.push(pool[j]);
  }
  return out;
}
/* 総合力（カードに出す数字）。野手向きは打撃側、投手向きは投球側を重く見る。 */
function ovrOf(P) {
  var bat = (P.meet + P.power + P.run + P.field + P.arm + P.catch) / 6;
  var pit = (P.velo + P.heavy + P.ctrl + P.stam + P.brk + P.mind) / 6;
  var v = P.role === "投手" ? pit * 0.75 + bat * 0.25
        : P.role === "野手" ? bat * 0.75 + pit * 0.25
        : (bat + pit) / 2;
  return Math.round(v * 100);
}

/* ══════════ 球場 ══════════
   ★ 極端な運で勝敗が決まらないよう、外野の広さとフェンスの高さだけを変える。
     天候や時間帯は<b>見た目だけ</b>（当たり判定は変えない）。 */
var STADIUMS = [
  { k: "city",   nm: "CITY DOME",    sub: "標準",           depth: 1.00, fence: 1.00, sky: ["#1a2a52", "#0d1530"], turf: "#1f7a4a", note: "くせのない標準の球場。ドームなので風の影響もない" },
  { k: "ocean",  nm: "OCEAN STADIUM",sub: "外野が広い",     depth: 1.10, fence: 1.05, sky: ["#1d5a8c", "#0b2b48"], turf: "#227f52", note: "外野が広く、長打が出にくいぶん三塁打が生まれやすい" },
  { k: "night",  nm: "NIGHT STADIUM",sub: "外野がせまい",   depth: 0.92, fence: 0.95, sky: ["#141024", "#080615"], turf: "#1a6b42", note: "外野がせまく、フェンスも低い。打ち合いになりやすい" },
  { k: "sky",    nm: "SKY STADIUM",  sub: "フェンスが高い", depth: 1.00, fence: 1.30, sky: ["#2a4f8f", "#12224a"], turf: "#238a55", note: "フェンスが高く、大飛球が跳ね返ってくる" },
  { k: "future", nm: "FUTURE ARENA", sub: "内野が速い",     depth: 1.00, fence: 1.00, sky: ["#221a4a", "#0d0a24"], turf: "#2b6f8a", note: "人工芝が速く、内野の打球が抜けやすい", fast: 1.15 },
];

/* ══════════ チームスキル（シナジー） ══════════
   ★ 同じ属性・同じ型・同じレアリティをそろえると発動する。
     「集める楽しさ」を編成に反映するための枠。 */
var TEAM_SKILLS = [
  { k: "power",  nm: "POWER TEAM",    c: "#ff5e5e", need: "パワーヒッターが3人以上", desc: "長打が出やすくなる（打球速度 +8%）",
    test: function (ps) { return ps.filter(function (p) { return p.bat === "パワーヒッター"; }).length >= 3; }, eff: { hard: 0.08 } },
  { k: "speed",  nm: "SPEED TEAM",    c: "#3ec27b", need: "走力75以上が3人以上", desc: "走塁と盗塁が有利になる（+10%）",
    test: function (ps) { return ps.filter(function (p) { return p.run >= 75; }).length >= 3; }, eff: { run: 0.10 } },
  { k: "iron",   nm: "IRON DEFENSE",  c: "#7fd0ff", need: "守備75以上が4人以上", desc: "守備の捕球範囲が広がる（+12%）",
    test: function (ps) { return ps.filter(function (p) { return p.field >= 75; }).length >= 4; }, eff: { reach: 0.12 } },
  { k: "elem",   nm: "ELEMENT BOND",  c: "#c88bff", need: "同じ属性が4人以上", desc: "ミートとコントロールが上がる（+5）",
    test: function (ps) { var m = {}; ps.forEach(function (p) { m[p.el] = (m[p.el] || 0) + 1; }); return Object.keys(m).some(function (k) { return m[k] >= 4; }); }, eff: { meet: 5, ctrl: 5 } },
  { k: "legend", nm: "LEGEND NINE",   c: "#ffd257", need: "極彩祭・極華祭・極煌祭・戦姫祭のキャラが3人以上", desc: "CLUTCH ゲージがたまりやすくなる（+25%）",
    test: function (ps) { return ps.filter(function (p) { return p.top; }).length >= 3; }, eff: { clutch: 0.25 } },
  { k: "rookie", nm: "ROOKIE SPIRIT", c: "#8fd0ff", need: "SR が4人以上", desc: "全員のミート +4・守備 +4（少数精鋭への挑戦）",
    test: function (ps) { return ps.filter(function (p) { return p.rank === "SR"; }).length >= 4; }, eff: { meet: 4, field: 4 } },
  { k: "ace",    nm: "ACE STAFF",     c: "#ff9d2e", need: "投手適性 A 以上が3人以上", desc: "投手のスタミナ回復量 +10%",
    test: function (ps) { return ps.filter(function (p) { return "SA".indexOf(p.pos["投手"]) >= 0; }).length >= 3; }, eff: { stam: 0.10 } },
];

/* ══════════ CLUTCH MOMENT（試合中にためて使う） ══════════ */
var CLUTCH = [
  { k: "perfect", nm: "PERFECT SWING", c: "#ffd257", cost: 100, side: "off", desc: "この打席のあいだミートが大きく上がる" },
  { k: "powerp",  nm: "POWER PITCH",   c: "#ff5e5e", cost: 100, side: "def", desc: "次の1球の球威が上がる" },
  { k: "supercat",nm: "SUPER CATCH",   c: "#7fd0ff", cost: 80,  side: "def", desc: "この打球のあいだ捕球範囲が広がる" },
  { k: "lightning",nm:"LIGHTNING THROW",c:"#5aa9ff", cost: 80,  side: "def", desc: "この打球のあいだ送球が速くなる" },
  { k: "greenlight",nm:"GREEN LIGHT",  c: "#3ec27b", cost: 80,  side: "off", desc: "この打席のあいだ走塁が有利になる" },
];

/* ══════════ ランク ══════════ */
var RANKS = [
  { k: "BRONZE",   c: "#c08457", from: 0 },
  { k: "SILVER",   c: "#c7d0e0", from: 400 },
  { k: "GOLD",     c: "#ffd257", from: 900 },
  { k: "PLATINUM", c: "#7fe4d0", from: 1500 },
  { k: "DIAMOND",  c: "#8fd0ff", from: 2200 },
  { k: "MASTER",   c: "#c88bff", from: 3000 },
  { k: "LEGEND",   c: "#ff9d2e", from: 4000 },
];
function rankOf(pt) {
  var r = RANKS[0];
  for (var i = 0; i < RANKS.length; i++) if (pt >= RANKS[i].from) r = RANKS[i];
  return r;
}

/* ══════════ 全選手をつくる ══════════ */
var _players = null, _byId = null;
function build() {
  if (_players) return _players;
  var ids = (typeof CHAR_IDS !== "undefined") ? CHAR_IDS.slice() : Object.keys(CHARS || {});
  _players = []; _byId = {};
  ids.forEach(function (id) {
    var c = CHARS[id];
    if (!c) return;
    /* ★ 選手として使えるのは SR・SSR（＝XEVARION に実装されている全キャラ）。
       登場前のキャラ（charSecret）は出さない。 */
    try { if (typeof charSecret === "function" && charSecret(id)) return; } catch (e) {}
    var p = buildPlayer(id);
    if (!p) return;
    _players.push(p); _byId[id] = p;
  });
  return _players;
}
function get(id) { if (!_byId) build(); return _byId[id] || null; }

window.MD2DATA = {
  loadMbCore: loadMbCore,
  build: build, get: get,
  all: function () { return build(); },
  SKILLS: SKILLS, PITCH_ALL: PITCH_ALL, STADIUMS: STADIUMS,
  TEAM_SKILLS: TEAM_SKILLS, CLUTCH: CLUTCH, RANKS: RANKS, rankOf: rankOf,
  POS: POS, gradeOf: gradeOf, seedOf: seedOf,
};
})();
