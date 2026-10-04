/* ============================================================
   MagiAbyss — ma-input.js
   入力：PC（WASD・方向キー・マウス照準・左クリック・Q/E/R・Space・Tab・Esc・F）
         スマホ（左下の仮想スティック・右下のボタン）
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
  const KEYMAP = {
    KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down", KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
    Space: "dash", KeyQ: "skill", KeyE: "burst", KeyR: "ult", Tab: "map", Escape: "menu", KeyF: "interact", Enter: "interact", KeyP: "menu", KeyM: "map", KeyJ: "attack",
  };
  function onKey(e, down) {
    const a = KEYMAP[e.code];
    if (!a) return;
    if (!I.enabled) { if (a === "menu" && down) I.pressed.add("menu"); return; }
    if (a === "map" || a === "dash" || e.code.startsWith("Arrow") || a === "menu") e.preventDefault();
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
  /* スマホ：左半分のどこでも触ったところがスティックの中心になる */
  function bindTouch(zone, knobBase, knob) {
    const R = 46;
    function setKnob() {
      if (!knobBase) return;
      knobBase.style.left = I.stick.ox + "px"; knobBase.style.top = I.stick.oy + "px";
      knob.style.transform = "translate(" + (I.stick.x * R) + "px," + (I.stick.y * R) + "px)";
      knobBase.classList.toggle("on", I.stick.on);
    }
    zone.addEventListener("touchstart", (e) => {
      if (!I.enabled) return;
      e.preventDefault();
      I.touch = true;
      const t = e.changedTouches[0];
      if (I.stick.id != null) return;
      I.stick.id = t.identifier; I.stick.on = true;
      const r = zone.getBoundingClientRect();
      I.stick.ox = t.clientX - r.left; I.stick.oy = t.clientY - r.top; I.stick.x = 0; I.stick.y = 0;
      setKnob();
    }, { passive: false });
    zone.addEventListener("touchmove", (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== I.stick.id) continue;
        const r = zone.getBoundingClientRect();
        let dx = (t.clientX - r.left - I.stick.ox) / R, dy = (t.clientY - r.top - I.stick.oy) / R;
        const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
        I.stick.x = dx; I.stick.y = dy;
        const dz = Math.hypot(dx, dy) < 0.18;
        I.mx = dz ? 0 : dx; I.my = dz ? 0 : dy;
        setKnob();
      }
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== I.stick.id) continue;
        I.stick.id = null; I.stick.on = false; I.stick.x = 0; I.stick.y = 0; I.mx = 0; I.my = 0; setKnob();
      }
    };
    zone.addEventListener("touchend", end); zone.addEventListener("touchcancel", end);
  }
  /* 画面のボタン（data-act）。押しっぱなしは attack だけ */
  function bindButtons(root) {
    root.querySelectorAll("[data-act]").forEach((b) => {
      const a = b.getAttribute("data-act");
      const dn = (e) => { e.preventDefault(); e.stopPropagation(); I.touch = e.type === "touchstart" || I.touch; I.pressed.add(a); if (a === "attack") I.held.add("attack"); b.classList.add("down"); };
      const up = (e) => { e.preventDefault(); if (a === "attack") I.held.delete("attack"); b.classList.remove("down"); };
      b.addEventListener("touchstart", dn, { passive: false });
      b.addEventListener("touchend", up, { passive: false });
      b.addEventListener("touchcancel", up, { passive: false });
      b.addEventListener("mousedown", dn);
      b.addEventListener("mouseup", up);
      b.addEventListener("mouseleave", up);
    });
  }
  function consume(a) { if (I.pressed.has(a)) { I.pressed.delete(a); return true; } return false; }
  function clearAll() { I.pressed.clear(); I.held.clear(); I.keys = {}; I.mx = 0; I.my = 0; I.stick.on = false; I.stick.id = null; I.mouseDown = false; }
  window.addEventListener("keydown", (e) => onKey(e, true));
  window.addEventListener("keyup", (e) => onKey(e, false));
  window.addEventListener("blur", () => { clearAll(); });
  I.bindGame = bindGame; I.bindTouch = bindTouch; I.bindButtons = bindButtons; I.consume = consume; I.clearAll = clearAll;
  MA.Input = I;
})();
