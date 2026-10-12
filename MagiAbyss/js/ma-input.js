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
   ★★ 2026-10-12b（ご指定）
     ・ダッシュ回避は無し（行動の一覧・キー・スマホのボタンから外した）。
     ・スマホのボタンは4つとも同じ大きさ（固有技・技・秘技・必殺技）で、重ならないひし形に。
     ・スティックは左下に固定（指についてこない）。左側のどこをさわっても、固定した中心から指の方向へ進む。
       設定で「さわった所に出る」にもできる（そのときも中心は動かない）。
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
    ["attack", "通常攻撃（押しているあいだ）"], ["skill", "固有技"], ["burst", "技"], ["tech", "秘技（条件でたまる）"], ["ult", "必殺技"],
    ["interact", "調べる・決定"], ["map", "地図"], ["menu", "メニュー（ポーズ）"],
  ];
  const DEFAULT_KEYS = {
    up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
    attack: ["KeyJ", null], skill: ["KeyQ", null], burst: ["KeyE", null], tech: ["KeyT", null], ult: ["KeyR", null],
    interact: ["KeyF", "Enter"], map: ["Tab", "KeyM"], menu: ["Escape", "KeyP"],
  };
  /* スマホのボタンの枠。割り当てられる行動
     ★★ 2026-10-12 スマホでは通常攻撃はいつも自動（攻撃ボタンは無し・ご指定）。
     ★★ 2026-10-12b 4つとも同じ大きさのひし形（a＝下・b＝右・c＝左・d＝上）。ダッシュは無し */
  const TOUCH_SLOTS = ["a", "b", "c", "d"];
  const DEFAULT_TOUCH_MAP = { a: "skill", b: "burst", c: "tech", d: "ult" };
  const TOUCH_ACTS = ["skill", "burst", "tech", "ult", "interact", "map", "none"];
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
    if (a === "map" || e.code.startsWith("Arrow") || a === "menu" || e.code === "Space" || e.code === "Tab") e.preventDefault();
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
     window で受ける。ボタン・名札・枠の上をさわったときはスティックにしない。
     ★★ 2026-10-12b 標準は「左下に固定」（前は指についてきて、中心が動いてしまい動かしづらかった・ご指定）。
       中心から 60% まで倒すと全速（端まで倒さなくてよい） */
  const R = 46;
  function fixedStick() { const S = MA.Save && MA.Save.S; return !(S && S.set && S.set.stickMode === "float"); }
  const NOT_STICK = "button, a, input, select, textarea, label, [data-a], [data-act], .mdl, .no-stick, #rotate";
  let baseEl = null, knobEl = null, homeEl = null;
  function stickRefs() {
    if (!baseEl || !baseEl.isConnected) { baseEl = document.getElementById("tBase"); knobEl = document.getElementById("tKnob"); homeEl = document.getElementById("tHome"); }
  }
  function setKnob() {
    stickRefs();
    if (!baseEl) return;
    if (fixedStick()) { baseEl.style.left = ""; baseEl.style.top = ""; }
    else { baseEl.style.left = I.stick.ox + "px"; baseEl.style.top = I.stick.oy + "px"; }
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
      /* 固定のとき：中心は左下の丸のまん中。さわった所へすぐ倒す */
      if (fixedStick()) {
        stickRefs();
        const r = baseEl && baseEl.getBoundingClientRect();
        if (r && r.width) { I.stick.ox = r.left + r.width / 2; I.stick.oy = r.top + r.height / 2; }
        stickTo(t.clientX, t.clientY);
      }
      setKnob();
      if (e.cancelable) e.preventDefault();
      break;
    }
  }
  /* 指の位置 → つまみの位置と移動の向き（中心は動かさない） */
  function stickTo(cx, cy) {
    let dx = (cx - I.stick.ox) / R, dy = (cy - I.stick.oy) / R;
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    I.stick.x = dx; I.stick.y = dy;
    const m = Math.min(l, 1);
    if (m < 0.16) { I.mx = 0; I.my = 0; return; }
    const sp = Math.min(1, (m - 0.16) / 0.44 + 0.35);
    I.mx = dx / Math.max(m, 1e-6) * sp; I.my = dy / Math.max(m, 1e-6) * sp;
  }
  function onTouchMove(e) {
    if (I.stick.id == null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== I.stick.id) continue;
      stickTo(t.clientX, t.clientY);
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
    /* ★ 前の割り当て（攻撃ボタン・大きい丸・回避があったころ）は、新しい標準に読みかえる。同じ行動が2つの枠に入らないように */
    const old = !m || m.big !== undefined || TOUCH_SLOTS.some((s) => m[s] === "attack" || m[s] === "dash");
    const out = {}, used = new Set();
    TOUCH_SLOTS.forEach((s) => {
      let a = !old && TOUCH_ACTS.indexOf(m[s]) >= 0 ? m[s] : DEFAULT_TOUCH_MAP[s];
      if (a !== "none" && used.has(a)) a = "none";
      used.add(a); out[s] = a;
    });
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
