/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 会場のキャラ（★ 2026-09-28c VRoid のサンプル A / C / M / O / P を色違いにして使う・ご指定）
   ------------------------------------------------------------------
   ・モデル（chara/sample_*.glb）は1回だけ読み、1人ずつ骨と材質を作る（vrm.js の instantiate）。
   ・色違い：髪・服・目の色相（h）・あざやかさ（s）・明るさ（v）・掛ける色（c）。
   ・胸の揺れ（モデルの Bust の設定）は、大人に見える A だけ。M・O（アリス風・ロリータ風の服で子どもっぽく見える）は使わない。
   ・avatar.js（手作りのキャラ）と同じ呼び方にしてある：root / name / sp.h / update(dt, 速さ, {headYaw, action, actionT}) / setExpr / talkUntil / wave / sit
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE;
  const BASES = {
    A: { url: "chara/sample_A.glb?v=1", g: "f", bust: true },
    C: { url: "chara/sample_C.glb?v=1", g: "m" },
    M: { url: "chara/sample_M.glb?v=1", g: "f" },
    O: { url: "chara/sample_O.glb?v=1", g: "f" },
    P: { url: "chara/sample_P.glb?v=1", g: "m" }
  };
  const H = (h, s, v, c) => ({ h: h || 0, s: s == null ? 1 : s, v: v == null ? 1 : v, c });
  /* 名前つきの会場スタッフ（ベース・色） */
  const CAST = {
    minato: { name: "ミナト", role: "基調講演の司会", base: "P", tint: { hair: H(0.6, 0.6, 1.3), cloth: H(0, 1, 1, "#3a4a7a") } },
    kai: { name: "カイ", role: "TRACK A（ゲーム）の登壇者", base: "C", tint: { hair: H(3.4, 1.4, 1.2), cloth: H(0, 1, 1, "#e04a4a") } },
    yui: { name: "ユイ", role: "TRACK B（学習・AI）の登壇者", base: "A", tint: { hair: H(-1.4, 0.7, 1.3), cloth: H(2.2, 1.2), eye: H(1.8) } },
    ren: { name: "レン", role: "TRACK C（クリエイティブ）の登壇者", base: "C", tint: { hair: H(0.3, 1.2, 1.4), cloth: H(0, 1, 1, "#4fc0a0") } },
    tsumugi: { name: "ツムギ", role: "受付", base: "M", tint: { hair: H(2.4, 1.2, 0.9), cloth: H(2.8, 1.3), eye: H(3) } },
    aoi: { name: "アオイ", role: "案内カウンター", base: "P", tint: { hair: H(2.2, 1.3, 0.9), cloth: H(0, 1, 1, "#2a6a7a") } },
    koko: { name: "ココ", role: "カフェの店員", base: "M", tint: { hair: H(-2.6, 1.2, 0.8), cloth: H(-2.3, 0.8, 0.9) } },
    mio: { name: "ミオ", role: "ストアの店員", base: "O", tint: { hair: H(-0.9, 1.1, 1.3), cloth: H(0, 1, 1, "#ff7ab4") } },
    haru: { name: "ハル", role: "展示ホールの案内", base: "C", tint: { hair: H(-2.2, 1.5, 1.6), cloth: H(0, 1, 1, "#3a6ae8") } },
    sota: { name: "ソウタ", role: "スタジアムの審判", base: "P", tint: { hair: H(0, 0.1, 0.5), cloth: H(0, 0.1, 0.35) } },
    riko: { name: "リコ", role: "ボッチャのコーチ", base: "A", tint: { hair: H(2.1, 1.3, 1), cloth: H(0, 1, 1, "#5aa8ff") } },
    nagi: { name: "ナギ", role: "パークの案内", base: "A", tint: { hair: H(0.5, 0.8, 1.5), cloth: H(0, 1, 1, "#ff9a4a"), eye: H(-2) } },
    jin: { name: "ジン", role: "カートの整備士", base: "C", tint: { hair: H(0, 0.1, 1.8), cloth: H(0, 1, 1, "#ff5a3a") } },
    sakura: { name: "サクラ", role: "噴水広場のパフォーマー", base: "O", tint: { hair: H(-1.6, 1.2, 1.3), cloth: H(0, 1, 1, "#ff8ac8") } }
  };
  const loaded = {};
  /* ★★ 2026-10-01 読めなかったモデルがあっても止まらない（オフラインでまだ来場者のモデルを持っていないとき、
     前は「キャラクターを読みこめませんでした」でパークが始まらなかった）。読めたモデルで代わりに作る。
     1つも読めなければ、自分のキャラのモデル（chara01.glb・オフライン用に持っている）を色違いで使う。 */
  function preload(onProgress) {
    const keys = Object.keys(BASES); let n = 0;
    return Promise.all(keys.map((k) => XVRM.loadAsset(BASES[k].url).then((a) => { loaded[k] = a; }, (e) => { console.warn("来場者のモデルを読めませんでした", k, e); }).then(() => { n++; if (onProgress) onProgress(n, keys.length); })))
      .then(() => { if (!Object.keys(loaded).length) return XVRM.loadAsset("chara/chara01.glb?v=1").then((a) => { loaded.A = a; }, () => {}); });
  }
  const assetOf = (k) => loaded[k] || loaded.A || loaded[Object.keys(loaded)[0]];
  function Person(v, spec) {
    this.v = v; this.root = v.root; this.spec = spec;
    this.name = spec.name || "来場者"; this.sp = { h: v.height, role: spec.role || "" };
    this.sit = false; this.seatH = 0.5;
    this.arm = { R: { up: { rotation: {} } } };      /* 手作りキャラ用の書き方のなごり（使わない） */
  }
  Object.defineProperty(Person.prototype, "talkUntil", { get() { return this.v.talkUntil; }, set(x) { this.v.talkUntil = x; } });
  Object.defineProperty(Person.prototype, "wave", { get() { return this.v.wave; }, set(x) { this.v.wave = x; } });
  const EX = { smile: "happy", happy: "happy", proud: "happy", shy: "relaxed", closed: "relaxed", half: "relaxed", sleepy: "relaxed", sad: "sad", surprised: "surprised", angry: "angry" };
  Person.prototype.setExpr = function (e, ms) { this.v.setFace(EX[e] || "neutral", ms || 2500); };
  Person.prototype.play = function (a, d) { this.v.play(a, d); };
  Person.prototype.detail = function (on) { if (this.v.faceDetail) this.v.faceDetail(on); };
  Person.prototype.update = function (dt, vel, opt) {
    opt = opt || {};
    this.v.update(dt, { speed: vel || 0, sit: this.sit, seatH: opt.seatH != null ? opt.seatH : this.seatH, look: opt.headYaw || 0, action: opt.action, actionT: opt.actionT, noSpring: opt.noSpring, noFace: opt.noFace });
  };
  function make(spec, opt) {
    opt = opt || {};
    if (typeof spec === "string") spec = Object.assign({ id: spec }, CAST[spec]);
    const b = BASES[spec.base] || BASES.A, a = assetOf(spec.base);
    const v = XVRM.instantiate(a, { tint: spec.tint, outline: !!opt.outline, bust: !!b.bust, shadow: opt.shadow !== false, scale: spec.scale });
    v.resetSpring();
    return new Person(v, spec);
  }
  /* 来場者：ベースと色をランダムに */
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  function random() {
    const base = rnd(["A", "A", "C", "C", "M", "O", "P", "P"]);
    const hair = Math.random() < 0.35 ? H(0, 0.4 + Math.random() * 0.5, 0.6 + Math.random() * 0.9) : H(Math.random() * 6.28, 0.7 + Math.random() * 0.6, 0.8 + Math.random() * 0.5);
    const cloth = Math.random() < 0.5 ? H(Math.random() * 6.28, 0.8 + Math.random() * 0.5, 0.85 + Math.random() * 0.3) : H(0, 1, 1, rnd(["#ff8a8a", "#8ab8ff", "#9ae8a8", "#ffe07a", "#c8a8ff", "#ffffff", "#ffb07a", "#7ad8e0"]));
    return { base, name: "来場者", tint: { hair, cloth, eye: H(Math.random() * 6.28), shoes: H(Math.random() * 6.28) }, scale: 0.94 + Math.random() * 0.1 };
  }
  /* 競技の選手（チームの色） */
  function athlete(team, i) {
    const base = ["C", "A", "P", "C", "A"][i % 5];
    return { base, name: team.names ? team.names[i % team.names.length] : "選手", tint: { hair: H(Math.random() * 6.28, 0.9, 1), cloth: H(0, 1, 1, team.c) } };
  }
  window.XPeople = { BASES, CAST, preload, make, random, athlete };
})();
