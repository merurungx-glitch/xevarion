'use strict';
/* ============================================================
   MagiCraft 3D: 入力
   ・PC: ポインタロック + WASD + マウス (左=掘る/攻撃, 右=設置/使う)
   ・タッチ: 左下ジョイスティック + 画面ドラッグ視点 + ボタン
   ============================================================ */

const CTRL = (() => {
  const input = {
    forward: 0, strafe: 0, jump: false,
    dig: false,          // 押しっぱなし: 採掘/攻撃
    useQueue: 0,         // 設置/使う (エッジ)
    attackQueue: 0,      // 単発攻撃 (クリック)
  };
  const isTouch = window.matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
  const keys = {};
  let canvas, lookTouch = null, joyTouch = null;
  let joyBase = null, joyKnob = null;

  const LOOK_SENS_MOUSE = 0.0026, LOOK_SENS_TOUCH = 0.0052;

  function init(cv){
    canvas = cv;

    /* ---- キーボード ---- */
    addEventListener('keydown', e => {
      if (e.repeat) return;
      keys[e.code] = true;
      if (GAME.state !== 'play') return;
      if (e.code === 'KeyE'){ UI.togglePanel('inv'); e.preventDefault(); }
      if (e.code === 'KeyG'){ UI.togglePanel('grow'); e.preventDefault(); }
      if (e.code === 'Escape'){ UI.togglePanel('menu'); }
      if (e.code >= 'Digit1' && e.code <= 'Digit9') GAME.selectSlot(+e.code.slice(5) - 1);
    });
    addEventListener('keyup', e => { keys[e.code] = false; });

    /* ---- マウス ---- */
    if (!isTouch){
      canvas.addEventListener('click', () => {
        if (GAME.state === 'play' && !UI.panelOpen() && document.pointerLockElement !== canvas)
          canvas.requestPointerLock();
      });
      addEventListener('mousemove', e => {
        if (document.pointerLockElement !== canvas) return;
        const p = GAME.player;
        p.yaw += e.movementX * LOOK_SENS_MOUSE;
        p.pitch -= e.movementY * LOOK_SENS_MOUSE;
        p.pitch = Math.max(-1.55, Math.min(1.55, p.pitch));
      });
      addEventListener('mousedown', e => {
        if (document.pointerLockElement !== canvas) return;
        if (e.button === 0){ input.dig = true; input.attackQueue++; }
        if (e.button === 2) input.useQueue++;
      });
      addEventListener('mouseup', e => { if (e.button === 0) input.dig = false; });
      addEventListener('contextmenu', e => { if (GAME.state === 'play') e.preventDefault(); });
      addEventListener('wheel', e => {
        if (GAME.state !== 'play' || UI.panelOpen()) return;
        GAME.selectSlot((GAME.sel + (e.deltaY > 0 ? 1 : 8)) % 9);
      }, { passive: true });
    }

    /* ---- タッチ ---- */
    if (isTouch){
      buildTouchUI();
      canvas.addEventListener('touchstart', e => {
        SFX.unlock();
        for (const t of e.changedTouches){
          if (lookTouch === null){ lookTouch = t.identifier; lookTouch_x = t.clientX; lookTouch_y = t.clientY; }
        }
        e.preventDefault();
      }, { passive: false });
      let lookTouch_x = 0, lookTouch_y = 0;
      canvas.addEventListener('touchmove', e => {
        for (const t of e.changedTouches){
          if (t.identifier === lookTouch){
            const p = GAME.player;
            p.yaw += (t.clientX - lookTouch_x) * LOOK_SENS_TOUCH;
            p.pitch -= (t.clientY - lookTouch_y) * LOOK_SENS_TOUCH;
            p.pitch = Math.max(-1.55, Math.min(1.55, p.pitch));
            lookTouch_x = t.clientX; lookTouch_y = t.clientY;
          }
        }
        e.preventDefault();
      }, { passive: false });
      const endLook = e => {
        for (const t of e.changedTouches) if (t.identifier === lookTouch) lookTouch = null;
      };
      canvas.addEventListener('touchend', endLook);
      canvas.addEventListener('touchcancel', endLook);
    }
  }

  function buildTouchUI(){
    const wrap = document.createElement('div');
    wrap.id = 'touch-ui';
    wrap.innerHTML = `
      <div id="joy"><div id="joy-knob"></div></div>
      <div id="tbtns">
        <button id="tb-jump" class="tb">⬆</button>
        <button id="tb-act" class="tb tb-big">⛏️</button>
      </div>
      <div id="act-hint">長押し=破壊 / タップ=設置</div>`;
    document.body.appendChild(wrap);
    joyBase = document.getElementById('joy');
    joyKnob = document.getElementById('joy-knob');

    /* ジョイスティック */
    const JR = 52;
    let jx0 = 0, jy0 = 0;
    joyBase.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      joyTouch = t.identifier;
      const r = joyBase.getBoundingClientRect();
      jx0 = r.left + r.width / 2; jy0 = r.top + r.height / 2;
      SFX.unlock();
      e.preventDefault();
    }, { passive: false });
    joyBase.addEventListener('touchmove', e => {
      for (const t of e.changedTouches){
        if (t.identifier !== joyTouch) continue;
        let dx = t.clientX - jx0, dy = t.clientY - jy0;
        const len = Math.hypot(dx, dy);
        if (len > JR){ dx = dx / len * JR; dy = dy / len * JR; }
        joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
        input.strafe = dx / JR;
        input.forward = -dy / JR;
      }
      e.preventDefault();
    }, { passive: false });
    const joyEnd = e => {
      for (const t of e.changedTouches){
        if (t.identifier !== joyTouch) continue;
        joyTouch = null;
        joyKnob.style.transform = '';
        input.strafe = 0; input.forward = 0;
      }
    };
    joyBase.addEventListener('touchend', joyEnd);
    joyBase.addEventListener('touchcancel', joyEnd);

    /* ジャンプ (押しっぱなし) */
    const jb = document.getElementById('tb-jump');
    jb.addEventListener('touchstart', e => { input.jump = true; e.preventDefault(); }, { passive: false });
    jb.addEventListener('touchend', e => { input.jump = false; e.preventDefault(); }, { passive: false });
    jb.addEventListener('touchcancel', () => input.jump = false);

    /* アクション: 長押し=破壊/攻撃, ワンタップ=設置 (ボクセルクラフト風) */
    const ab = document.getElementById('tb-act');
    const TAP_MS = 180;
    let actT0 = 0;
    ab.addEventListener('touchstart', e => {
      actT0 = performance.now();
      input.dig = true;           // 押している間は採掘/攻撃 (進捗が溜まれば破壊)
      input.attackQueue++;        // モブへの初撃
      SFX.unlock();
      e.preventDefault();
    }, { passive: false });
    const actEnd = e => {
      input.dig = false;
      // 短いタップ(=採掘が完了しなかった)なら設置
      if (performance.now() - actT0 < TAP_MS) input.useQueue++;
      if (e) e.preventDefault();
    };
    ab.addEventListener('touchend', actEnd, { passive: false });
    ab.addEventListener('touchcancel', () => { input.dig = false; });
  }

  function poll(){
    if (!isTouch){
      input.forward = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      input.strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      input.jump = !!(keys.Space);
    }
    return input;
  }

  function showTouchUI(show){
    const el = document.getElementById('touch-ui');
    if (el) el.style.display = show ? '' : 'none';
  }

  return { init, poll, input, isTouch, showTouchUI };
})();
