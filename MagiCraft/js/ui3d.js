'use strict';
/* ============================================================
   MagiCraft 3D: UI (HUD / パネル / タイトル / クリア画面)
   DOM は #hud と #panel-layer に動的生成
   ============================================================ */

function fmtTime(t){
  const m = Math.floor(t / 60), s = Math.floor(t % 60), d = Math.floor((t % 1) * 10);
  return `${m}:${String(s).padStart(2, '0')}.${d}`;
}

const UI = (() => {
  let hud, layer;
  let curPanel = null;      // 'inv' | 'craft' | 'enhance' | 'grow' | null
  let tableMode = false;

  function el(id){ return document.getElementById(id); }

  function init(){
    hud = el('hud'); layer = el('panel-layer');
    hud.innerHTML = `
      <div id="topbar">
        <div class="pill">💀 <span id="deaths-hud">0</span></div>
        <div class="pill" id="dim-pill">🌍 地上</div>
      </div>
      <div id="bossbar" class="hidden">
        <div class="bb-name">次元魔神ヴォイドリア</div>
        <div class="bb-track"><i id="bb-fill"></i></div>
      </div>
      <div id="crosshair">
        <svg width="46" height="46" viewBox="0 0 46 46">
          <line x1="23" y1="15" x2="23" y2="31" stroke="#fff" stroke-width="2" opacity="0.85"/>
          <line x1="15" y1="23" x2="31" y2="23" stroke="#fff" stroke-width="2" opacity="0.85"/>
          <circle id="mine-ring" cx="23" cy="23" r="19" fill="none" stroke="#ffd34d" stroke-width="3.5"
            stroke-dasharray="119.4" stroke-dashoffset="119.4" transform="rotate(-90 23 23)"/>
        </svg>
        <div id="target-name"></div>
      </div>
      <div id="status">
        <div class="bar hp"><i id="hp-fill"></i><span id="hp-num"></span></div>
        <div class="bar xp"><i id="xp-fill"></i><span id="xp-num"></span></div>
      </div>
      <div id="hotbar"></div>
      <div id="side-btns">
        <button class="sb" id="sb-inv" title="インベントリ [E]">🎒</button>
        <button class="sb" id="sb-grow" title="育成 [G]">📊</button>
        <button class="sb" id="sb-menu" title="メニュー [Esc]">☰</button>
      </div>
      <div id="toast-area"></div>
      <div id="hurt-flash"></div>`;

    el('sb-inv').onclick = () => togglePanel('inv');
    el('sb-grow').onclick = () => togglePanel('grow');
    el('sb-menu').onclick = () => togglePanel('menu');

    // ホットバー
    const hb = el('hotbar');
    for (let i = 0; i < 9; i++){
      const s = document.createElement('div');
      s.className = 'slot'; s.dataset.i = i;
      s.addEventListener('pointerdown', e => { GAME.selectSlot(i); e.preventDefault(); });
      hb.appendChild(s);
    }
  }

  /* ---------------- HUD 更新 ---------------- */
  function refreshHUD(){
    el('deaths-hud').textContent = GAME.deaths;
    el('dim-pill').textContent = GAME.dim === 'void' ? '🌌 ヴォイド次元' : '🌍 地上';
    const p = GAME.player;
    el('hp-fill').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
    el('hp-num').textContent = `❤ ${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`;
    const need = GAME.expNeed();
    el('xp-fill').style.width = Math.min(100, GAME.exp / need * 100) + '%';
    el('xp-num').textContent = `Lv${GAME.lv}  ${GAME.exp}/${need}`;
    // ボスバー
    const boss = EN.boss;
    el('bossbar').classList.toggle('hidden', !boss);
    if (boss) el('bb-fill').style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%';
  }

  function refreshHotbar(){
    const hb = el('hotbar');
    for (let i = 0; i < 9; i++){
      const s = hb.children[i];
      const key = GAME.hotbar[i];
      s.classList.toggle('sel', i === GAME.sel);
      if (key && GAME.inv[key] > 0){
        s.innerHTML = `${ICONS.img(key)}<span class="n">${GAME.inv[key]}</span>`;
      } else if (key && (ITEMS[key].tool || ITEMS[key].melee) && GAME.inv[key] > 0){
        s.innerHTML = ICONS.img(key);
      } else {
        if (key && !(GAME.inv[key] > 0)) GAME.hotbar[i] = null;
        s.innerHTML = '';
      }
    }
  }

  function setMineProgress(r){ // 0..1, 0で非表示
    const ring = el('mine-ring');
    ring.style.strokeDashoffset = 119.4 * (1 - Math.min(1, Math.max(0, r)));
    ring.style.opacity = r > 0 ? 1 : 0;
  }
  function setTargetName(t){ el('target-name').textContent = t || ''; }

  function toast(msg, type){
    const a = el('toast-area');
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    a.appendChild(t);
    setTimeout(() => t.classList.add('show'), 20);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2400);
    while (a.children.length > 4) a.firstChild.remove();
  }

  function hurtFlash(){
    const f = el('hurt-flash');
    f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  }

  /* ---------------- パネル ---------------- */
  function panelOpen(){ return !!curPanel; }
  function closePanel(){
    curPanel = null; tableMode = false;
    layer.innerHTML = '';
    layer.classList.remove('open');
  }
  function togglePanel(kind, opt){
    if (curPanel === kind){ closePanel(); return; }
    openPanel(kind, opt);
  }
  function openPanel(kind, opt){
    if (GAME.state !== 'play') return;
    curPanel = kind;
    tableMode = !!(opt && opt.table);
    layer.classList.add('open');
    if (kind === 'inv') renderInv();
    else if (kind === 'grow') renderGrow();
    else if (kind === 'enhance') renderEnhance();
    else if (kind === 'menu') renderMenu();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /* --- メニュー (セーブ / タイトル) --- */
  function renderMenu(){
    panelShell('☰ メニュー',
      `<div class="menu-list">
        <button class="big-btn purple" id="mn-save">💾 セーブする</button>
        <button class="big-btn ghost" id="mn-resume">▶ 冒険にもどる</button>
        <button class="big-btn ghost" id="mn-title">🏠 セーブしてタイトルへ</button>
        <p class="small-note">セーブすれば次回タイトルの「つづきから」で再開できます。</p>
      </div>`);
    el('mn-save').onclick = () => { GAME.save(); };
    el('mn-resume').onclick = () => closePanel();
    el('mn-title').onclick = () => { GAME.save(); location.reload(); };
  }

  function panelShell(title, bodyHTML){
    layer.innerHTML = `
      <div class="p-back"></div>
      <div class="panel">
        <div class="p-head"><span>${title}</span><button class="p-close">✕</button></div>
        <div class="p-body">${bodyHTML}</div>
      </div>`;
    layer.querySelector('.p-back').onclick = closePanel;
    layer.querySelector('.p-close').onclick = closePanel;
  }

  /* --- インベントリ + クラフト --- */
  function renderInv(){
    const items = Object.keys(GAME.inv).filter(k => GAME.inv[k] > 0);
    const invHTML = items.length
      ? items.map(k => {
          const it = ITEMS[k];
          return `<button class="inv-it" data-k="${k}" title="${it.desc || ''}">
            ${ICONS.img(k)}<span class="nm">${it.name}</span><span class="ct">x${GAME.inv[k]}</span></button>`;
        }).join('')
      : '<div class="empty">まだ何も持っていない。ブロックを掘ろう!</div>';

    const recipes = RECIPES.filter(r => tableMode || !r.table);
    const rHTML = recipes.map((r, i) => {
      const ok = GAME.canCraft(r);
      const needs = Object.entries(r.needs).map(([k, n]) =>
        `<span class="need ${(GAME.inv[k] || 0) >= n ? 'ok' : 'ng'}">${ICONS.img(k, 'sm')}${n}</span>`).join(' ');
      return `<div class="rc ${ok ? '' : 'dis'}">
        ${ICONS.img(r.out)}
        <div class="rc-mid"><b>${ITEMS[r.out].name}${r.n > 1 ? ' x' + r.n : ''}</b><small>${needs}</small></div>
        <button class="rc-go" data-i="${RECIPES.indexOf(r)}" ${ok ? '' : 'disabled'}>作る</button>
      </div>`;
    }).join('');

    panelShell(tableMode ? '🛠️ 作業台クラフト' : '🎒 インベントリ',
      `<div class="p-cols">
        <div class="p-col">
          <div class="p-sub">アイテム <small>(タップで選択中のスロットにセット)</small></div>
          <div class="inv-grid">${invHTML}</div>
        </div>
        <div class="p-col">
          <div class="p-sub">クラフト ${tableMode ? '' : '<small>(作業台で上位レシピ解放)</small>'}</div>
          <div class="rc-list">${rHTML}</div>
        </div>
      </div>`);

    layer.querySelectorAll('.inv-it').forEach(b => b.onclick = () => {
      GAME.hotbar[GAME.sel] = b.dataset.k;
      refreshHotbar();
      toast(`${ITEMS[b.dataset.k].icon} ${ITEMS[b.dataset.k].name} をスロット${GAME.sel + 1}にセット`);
    });
    layer.querySelectorAll('.rc-go').forEach(b => b.onclick = () => {
      GAME.craft(RECIPES[+b.dataset.i]);
      renderInv(); refreshHotbar();
    });
  }

  /* --- 育成 --- */
  function renderGrow(){
    const g = GAME;
    const gears = ['g_blade', 'g_armor', 'g_talis'].filter(k => g.inv[k] > 0);
    const gearHTML = gears.length
      ? gears.map(k => `<div class="gear">${ICONS.img(k)}
          <div><b>${ITEMS[k].name}</b> <small>+${g.enh[k] || 0}強化</small><br><small>${ITEMS[k].desc}</small></div></div>`).join('')
      : '<div class="empty">魔導装備は作業台でクラフト (⚔️🛡️📿)</div>';
    panelShell('📊 育成',
      `<div class="grow-stats">
        <div class="gs"><small>Lv</small><b>${g.lv}</b></div>
        <div class="gs"><small>ATK</small><b>${g.atk()}</b></div>
        <div class="gs"><small>HP</small><b>${g.player.maxHp}</b></div>
        <div class="gs"><small>クリ率</small><b>${Math.round(g.critChance() * 100)}%</b></div>
      </div>
      <div class="p-sub">アイテム使用</div>
      <div class="use-row">
        <button id="use-bdata" ${g.inv.bdata > 0 ? '' : 'disabled'}>📀 バトルデータ使用 (+40EXP) x${g.inv.bdata || 0}</button>
        <button id="use-manual" ${g.inv.manual > 0 && g.skillCrit < 5 ? '' : 'disabled'}>📘 マニュアル使用 (クリ率+5%) Lv${g.skillCrit}/5</button>
      </div>
      <div class="p-sub">魔導装備 (所持で自動装備)</div>
      ${gearHTML}`);
    const rb = el('use-bdata'), rm = el('use-manual');
    if (rb) rb.onclick = () => { if (GAME.useItem('bdata')) renderGrow(); };
    if (rm) rm.onclick = () => { if (GAME.useItem('manual')) renderGrow(); };
  }

  /* --- 強化台 --- */
  function renderEnhance(){
    const gears = ['g_blade', 'g_armor', 'g_talis'].filter(k => GAME.inv[k] > 0);
    const html = gears.length ? gears.map(k => {
      const lv = GAME.enh[k] || 0;
      if (lv >= ENH_MAX) return `<div class="rc">${ICONS.img(k)}<div class="rc-mid"><b>${ITEMS[k].name} +${lv}</b><small>最大強化!</small></div></div>`;
      const cost = enhCost(lv);
      const ok = Object.entries(cost).every(([m, n]) => (GAME.inv[m] || 0) >= n);
      const needs = Object.entries(cost).map(([m, n]) =>
        `<span class="need ${(GAME.inv[m] || 0) >= n ? 'ok' : 'ng'}">${ICONS.img(m, 'sm')}${n}</span>`).join(' ');
      return `<div class="rc ${ok ? '' : 'dis'}">
        ${ICONS.img(k)}
        <div class="rc-mid"><b>${ITEMS[k].name} +${lv} → +${lv + 1}</b><small>${needs}</small></div>
        <button class="rc-go" data-k="${k}" ${ok ? '' : 'disabled'}>強化</button>
      </div>`;
    }).join('') : '<div class="empty">魔導装備 (⚔️🛡️📿) を持っていない</div>';
    panelShell('🔩 強化台', `<div class="rc-list">${html}</div>`);
    layer.querySelectorAll('.rc-go').forEach(b => b.onclick = () => {
      GAME.enhance(b.dataset.k);
      renderEnhance();
    });
  }

  /* --- ゲート確認 --- */
  function confirmGate(){
    layer.classList.add('open');
    curPanel = 'gate';
    layer.innerHTML = `
      <div class="p-back"></div>
      <div class="panel small">
        <div class="p-head"><span>🌀 次元ゲート</span><button class="p-close">✕</button></div>
        <div class="p-body center">
          <p>ヴォイド次元へ跳び、<b>次元魔神ヴォイドリア</b>に挑みますか?</p>
          <p class="warn">⚠ 剣と装備の準備を忘れずに。敗北すると 💀+1</p>
          <button class="big-btn purple" id="gate-go">挑む!</button>
        </div>
      </div>`;
    layer.querySelector('.p-back').onclick = closePanel;
    layer.querySelector('.p-close').onclick = closePanel;
    el('gate-go').onclick = () => { closePanel(); GAME.enterVoid(); };
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /* --- 死亡画面 --- */
  function showDeath(cause){
    layer.classList.add('open');
    curPanel = 'death';
    layer.innerHTML = `
      <div class="p-back dark"></div>
      <div class="panel small death">
        <div class="p-body center">
          <div class="skull">💀</div>
          <h2>力尽きた…</h2>
          <p>${cause || ''} / 死亡回数 +1 (合計 ${GAME.deaths})</p>
          <button class="big-btn" id="respawn-btn">リスポーン</button>
        </div>
      </div>`;
    el('respawn-btn').onclick = () => { closePanel(); GAME.respawn(); };
  }

  /* --- クリア画面 --- */
  function showClear(deaths){
    layer.classList.add('open');
    curPanel = 'clear';
    layer.innerHTML = `
      <div class="p-back dark"></div>
      <div class="panel small clear">
        <div class="p-body center">
          <div class="crown">👑</div>
          <h2>次元魔神ヴォイドリア 討伐!!</h2>
          <div class="clear-sub">世界に平和が戻った。</div>
          <p>💀 冒険中の力尽きた回数: ${deaths}</p>
          <button class="big-btn purple" id="clear-title">タイトルへ</button>
          <button class="big-btn ghost" id="clear-stay">ワールドを探索し続ける</button>
        </div>
      </div>`;
    el('clear-title').onclick = () => location.reload();
    el('clear-stay').onclick = () => { closePanel(); GAME.state = 'play'; GAME.returnFromVoid(); };
  }

  /* --- タイトル --- */
  function showTitle(){
    const hasSave = GAME.hasSave();
    layer.classList.add('open');
    curPanel = 'title';
    layer.innerHTML = `
      <div class="p-back title-bg"></div>
      <div class="panel title-panel">
        <div class="p-body center">
          <img src="../../thumbs/MagiCraft.jpg" class="title-logo" alt="MagiCraft">
          <h1>MagiCraft <span class="t3d">3D</span></h1>
          <p class="tagline">掘って、クラフトして、育成して、<br>次元魔神ヴォイドリアを討つ探索アドベンチャー。</p>
          ${hasSave ? '<button class="big-btn purple" id="resume-btn">▶ つづきから</button>' : ''}
          <button class="big-btn ${hasSave ? 'ghost' : 'purple'}" id="start-btn">${hasSave ? '🆕 はじめから' : '▶ はじめる'}</button>
          <button class="big-btn ghost" id="howto-btn">操作方法</button>
          <div id="howto" class="howto hidden">${CTRL.isTouch ? `
            <p>🕹 左下スティック: 移動 / 画面ドラッグ: 視点</p>
            <p>⛏️ 長押し: 破壊・攻撃 / タップ: ブロック設置 / ⬆: ジャンプ</p>` : `
            <p>WASD: 移動 / マウス: 視点 (クリックでロック) / Space: ジャンプ</p>
            <p>左クリック長押し: 破壊・攻撃 / 右クリック: 設置・使う</p>
            <p>E: インベントリ / G: 育成 / Esc: メニュー(セーブ) / 1〜9・ホイール: 持ち替え</p>`}
            <p>🔥 石炭+棒で「松明」をクラフト→設置して夜や洞窟を照らそう</p>
            <p>🏊 水に落ちたら岸に向かって泳ぎながらジャンプで上がれる</p>
            <p>🌀 マギ鉱石を集め「次元ゲート」をクラフト→設置→使う でボス戦!</p>
          </div>
        </div>
      </div>`;
    if (hasSave) el('resume-btn').onclick = () => { SFX.unlock(); closePanel(); GAME.resume(); };
    el('start-btn').onclick = () => {
      SFX.unlock();
      if (GAME.hasSave() && !confirm('新しい世界を始めると、いまのセーブは消えます。よろしいですか?')) return;
      GAME.deleteSave(); closePanel(); GAME.startRun();
    };
    el('howto-btn').onclick = () => el('howto').classList.toggle('hidden');
  }

  return {
    init, el, refreshHUD, refreshHotbar, setMineProgress, setTargetName,
    toast, hurtFlash, panelOpen, openPanel, togglePanel, closePanel,
    confirmGate, showDeath, showClear, showTitle,
  };
})();
