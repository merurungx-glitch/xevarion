/* ============================================================
   MagiAbyss — ma-input.js
   入力：PC（キーボード・マウス）／スマホ（スティック・ボタン）
   ★★ 2026-10-05 作り直し（ご指定）
     ・キーボードの割り当ては設定で変えられる（S.set.keys ＝ { 行動: [コード, コード] }）。
     ・スマホのスティックは「画面の左半分（設定で右）の、ボタンでないところ」をさわると出る。
       前は左下に見えない板（.t-zone）を敷いていたので、その下のボタン（キャラの「変更」・施設の名札・
       「調べる」）が押せなかった。いまは window で受けて、ボタンの上なら何もしない。
     ・スマホのボタンは5つの枠に好きな行動を割り当てられる（S.set.touch.map）。
   ★ ゲーム画面でのタッチは画面をスクロールさせない（touch-action:none＋preventDefault）。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const I = {
    mx: 0, my: 0,                 // 移動（-1〜1）
    aimSX: 0, aimSY: 0, hasMouse: false, mouseDown: false,
    keys: {}, pressed: new Set(), held: new Set(),
    touch: false, stick: { id: null, ox: 0, oy: 0, x: 0, y: 0, on: false },
    enabled: false,
  };

  /* ══ 行動の一覧（設定の画面もこの順で並べる）══ */
  const ACTIONS = [
    ["up", "上へ移動"], ["down", "下へ移動"], ["left", "左へ移動"], ["right", "右へ移動"],
    ["attack", "通常攻撃（押しているあいだ）"], ["skill", "スキル"], ["burst", "技"], ["ult", "必殺技"], ["dash", "回避（ダッシュ）"],
    ["interact", "調べる・決定"], ["map", "地図"], ["menu", "メニュー（ポーズ）"],
  ];
  const DEFAULT_KEYS = {
    up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
    attack: ["KeyJ", null], skill: ["KeyQ", null], burst: ["KeyE", null], ult: ["KeyR", null], dash: ["Space", null],
    interact: ["KeyF", "Enter"], map: ["Tab", "KeyM"], menu: ["Escape", "KeyP"],
  };
  /* スマホのボタンの枠（big＝いちばん大きい丸）。割り当てられる行動 */
  const TOUCH_SLOTS = ["big", "a", "b", "c", "d"];
  const DEFAULT_TOUCH_MAP = { big: "attack", a: "skill", b: "burst", c: "ult", d: "dash" };
  const TOUCH_ACTS = ["attack", "skill", "burst", "ult", "dash", "interact", "map", "none"];
  let KEYMAP = {};
  function keysNow() {
    const S = MA.Save && MA.Save.S, k = S && S.set && S.set.keys;
    const out = {};
    ACTIONS.forEach(([a]) => { const v = k && Array.isArray(k[a]) ? k[a] : DEFAULT_KEYS[a]; out[a] = [v[0] || null, v[1] || null]; });
    return out;
  }
  function rebuildKeys() {
    KEYMAP = {};
    const k = keysNow();
    ACTIONS.forEach(([a]) => k[a].forEach((code) => { if (code && !KEYMAP[code]) KEYMAP[code] = a; }));
  }
  /* 表示用のキーの名前（Q・SPACE・↑ など） */
  function codeLabel(code) {
    if (!code) return "";
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad\d$/.test(code)) return "テンキー" + code.slice(6);
    if (/^F\d+$/.test(code)) return code;
    return { Space: "SPACE", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", Escape: "ESC", Tab: "TAB", Enter: "ENTER",
      ShiftLeft: "左SHIFT", ShiftRight: "右SHIFT", ControlLeft: "左CTRL", ControlRight: "右CTRL", AltLeft: "左ALT", AltRight: "右ALT",
      Backspace: "BS", CapsLock: "CAPS", Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/", Backslash: "\\", BracketLeft: "[", BracketRight: "]",
      Minus: "-", Equal: "=", Backquote: "`", IntlRo: "ろ", IntlYen: "￥" }[code] || code;
  }
  function keyLabel(action) { const k = keysNow()[action]; return codeLabel(k && (k[0] || k[1])); }

  function onKey(e, down) {
    if (I.capture) { if (down) { e.preventDefault(); const f = I.capture; I.capture = null; f(e.code); } return; }
    const a = KEYMAP[e.code];
    if (!a) return;
    /* 入力欄に打っているときは何もしない */
    const tg = e.target; if (tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.tagName === "SELECT")) return;
    if (!I.enabled) { if (a === "menu" && down) I.pressed.add("menu"); return; }
    if (a === "map" || a === "dash" || e.code.startsWith("Arrow") || a === "menu" || e.code === "Space" || e.code === "Tab") e.preventDefault();
    if (down) { if (!I.keys[a]) I.pressed.add(a); I.keys[a] = true; if (a === "attack") I.held.add("attack"); }
    else { I.keys[a] = false; if (a === "attack") I.held.delete("attack"); }
    I.touch = false;
    upd();
  }
  function upd() {
    if (I.stick.on) return;
    let x = (I.keys.right ? 1 : 0) - (I.keys.left ? 1 : 0), y = (I.keys.down ? 1 : 0) - (I.keys.up ? 1 : 0);
    const l = Math.hypot(x, y); if (l > 0) { x /= l; y /= l; }
    I.mx = x; I.my = y;
  }
  function bindGame(canvas) {
    canvas.addEventListener("mousemove", (e) => { const r = canvas.getBoundingClientRect(); I.aimSX = (e.clientX - r.left) / r.width; I.aimSY = (e.clientY - r.top) / r.height; I.hasMouse = true; });
    canvas.addEventListener("mousedown", (e) => { if (e.button === 0) { I.mouseDown = true; I.held.add("attack"); I.pressed.add("attackTap"); } });
    window.addEventListener("mouseup", (e) => { if (e.button === 0) { I.mouseDown = false; if (!I.keys.attack) I.held.delete("attack"); } });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /* ══ スマホのスティック ══
     window で受ける。ボタン・名札・枠の上をさわったときはスティックにしない。 */
  const R = 46;
  const NOT_STICK = "button, a, input, select, textarea, label, [data-a], [data-act], .mdl, .no-stick, #rotate";
  let baseEl = null, knobEl = null, homeEl = null;
  function stickRefs() {
    if (!baseEl || !baseEl.isConnected) { baseEl = document.getElementById("tBase"); knobEl = document.getElementById("tKnob"); homeEl = document.getElementById("tHome"); }
  }
  function setKnob() {
    stickRefs();
    if (!baseEl) return;
    baseEl.style.left = I.stick.ox + "px"; baseEl.style.top = I.stick.oy + "px";
    if (knobEl) knobEl.style.transform = "translate(" + (I.stick.x * R) + "px," + (I.stick.y * R) + "px)";
    baseEl.classList.toggle("on", I.stick.on);
    if (homeEl) homeEl.classList.toggle("off", I.stick.on);
  }
  function stickAllowed() {
    if (!I.enabled) return false;
    const scr = document.body.dataset.scr;
    if (scr !== "run" && scr !== "guild") return false;
    if (MA.UI && MA.UI.topModal && MA.UI.topModal()) return false;
    if (document.documentElement.classList.contains("ma-port")) return false;
    return true;
  }
  function onTouchStart(e) {
    if (!stickAllowed() || I.stick.id != null) return;
    const right = document.body.classList.contains("stick-right");
    for (const t of e.changedTouches) {
      const el = t.target;
      if (el && el.closest && el.closest(NOT_STICK)) continue;
      const W = window.innerWidth;
      if (right ? t.clientX < W * 0.42 : t.clientX > W * 0.58) continue;
      I.touch = true;
      I.stick.id = t.identifier; I.stick.on = true;
      I.stick.ox = t.clientX; I.stick.oy = t.clientY; I.stick.x = 0; I.stick.y = 0;
      setKnob();
      if (e.cancelable) e.preventDefault();
      break;
    }
  }
  function onTouchMove(e) {
    if (I.stick.id == null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== I.stick.id) continue;
      let dx = (t.clientX - I.stick.ox) / R, dy = (t.clientY - I.stick.oy) / R;
      const l = Math.hypot(dx, dy);
      /* 指がスティックの外まで行ったら、中心がついてくる（大きく動かしても止まらない） */
      if (l > 1.35) { const k = (l - 1.35) / l; I.stick.ox += (t.clientX - I.stick.ox) * k; I.stick.oy += (t.clientY - I.stick.oy) * k; dx = (t.clientX - I.stick.ox) / R; dy = (t.clientY - I.stick.oy) / R; }
      const l2 = Math.hypot(dx, dy); if (l2 > 1) { dx /= l2; dy /= l2; }
      I.stick.x = dx; I.stick.y = dy;
      const dz = Math.hypot(dx, dy) < 0.18;
      I.mx = dz ? 0 : dx; I.my = dz ? 0 : dy;
      setKnob();
      if (e.cancelable) e.preventDefault();
    }
  }
  function onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier !== I.stick.id) continue;
      I.stick.id = null; I.stick.on = false; I.stick.x = 0; I.stick.y = 0; I.mx = 0; I.my = 0; setKnob();
    }
  }
  window.addEventListener("touchstart", onTouchStart, { passive: false });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd);
  window.addEventListener("touchcancel", onTouchEnd);
  /* 前の呼び方の名残（ma-guild / ma-ui から呼ばれても困らないように） */
  function bindTouch() { stickRefs(); setKnob(); }

  /* 画面のボタン（data-act）。押しっぱなしは attack だけ */
  function bindButtons(root) {
    root.querySelectorAll("[data-act]").forEach((b) => {
      if (b._maBound) return; b._maBound = 1;
      const dn = (e) => { e.preventDefault(); e.stopPropagation(); const a = b.getAttribute("data-act"); if (!a || a === "none") return; I.touch = e.type === "touchstart" || I.touch; I.pressed.add(a); if (a === "attack") I.held.add("attack"); b.classList.add("down"); };
      const up = (e) => { e.preventDefault(); const a = b.getAttribute("data-act"); if (a === "attack" && !I.keys.attack && !I.mouseDown) I.held.delete("attack"); b.classList.remove("down"); };
      b.addEventListener("touchstart", dn, { passive: false });
      b.addEventListener("touchend", up, { passive: false });
      b.addEventListener("touchcancel", up, { passive: false });
      b.addEventListener("mousedown", dn);
      b.addEventListener("mouseup", up);
      b.addEventListener("mouseleave", up);
    });
  }
  function consume(a) { if (I.pressed.has(a)) { I.pressed.delete(a); return true; } return false; }
  function clearAll() { I.pressed.clear(); I.held.clear(); I.keys = {}; I.mx = 0; I.my = 0; I.stick.on = false; I.stick.id = null; I.mouseDown = false; setKnob(); }
  /* スマホのボタンの割り当て（設定） */
  function touchMap() {
    const S = MA.Save && MA.Save.S, m = S && S.set && S.set.touch && S.set.touch.map;
    const out = {};
    TOUCH_SLOTS.forEach((s) => { out[s] = m && TOUCH_ACTS.indexOf(m[s]) >= 0 ? m[s] : DEFAULT_TOUCH_MAP[s]; });
    return out;
  }
  window.addEventListener("keydown", (e) => onKey(e, true));
  window.addEventListener("keyup", (e) => onKey(e, false));
  window.addEventListener("blur", () => { clearAll(); });
  rebuildKeys();
  Object.assign(I, { bindGame, bindTouch, bindButtons, consume, clearAll, rebuildKeys, keysNow, keyLabel, codeLabel, touchMap,
    ACTIONS, DEFAULT_KEYS, TOUCH_SLOTS, DEFAULT_TOUCH_MAP, TOUCH_ACTS, capture: null });
  MA.Input = I;
})();
