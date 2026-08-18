'use strict';
/* ============================================================
   MagiCraft 3D: メイン
   掘る → クラフト → 育成 → 次元ゲート → ボス討伐 の探索アドベンチャー
   (タイムアタックは廃止。途中セーブ対応)
   ============================================================ */

const GAME = {
  state: 'boot',      // boot | title | play | dead | clear
  dim: 'over',        // over | void
  over: null, void: null,
  seed: 0,
  player: new Player(),
  time: 0, deaths: 0,
  inv: {}, hotbar: new Array(9).fill(null), sel: 0,
  lv: 1, exp: 0, skillCrit: 0, enh: {},
  dayT: 450,          // 正午から開始 (CYCLE 900 の半分)
  spawnT: 0, regenT: 0,
  mine: null,         // {x,y,z,progress,total}
  atkCd: 0,
  returnPos: null,
  SAVE_KEY: 'magicraft3d_save',
  cleared: false,

  /* ---------------- ステータス ---------------- */
  expNeed(){ return 30 + (this.lv - 1) * 25; },
  atk(){
    let a = 10 + (this.lv - 1) * 2;
    if (this.inv.g_blade > 0) a += 30 + (this.enh.g_blade || 0) * 6;
    return a;
  },
  critChance(){
    let c = 0.10 + this.skillCrit * 0.05;
    if (this.inv.g_talis > 0) c += 0.10 + (this.enh.g_talis || 0) * 0.02;
    return Math.min(c, 0.8);
  },
  recalcHp(){
    const p = this.player;
    const ratio = p.maxHp ? p.hp / p.maxHp : 1;
    p.maxHp = 100 + (this.lv - 1) * 12 + (this.inv.g_armor > 0 ? 120 + (this.enh.g_armor || 0) * 25 : 0);
    p.hp = Math.min(p.maxHp, Math.max(1, Math.round(p.maxHp * ratio)));
  },
  gainExp(n){
    this.exp += n;
    while (this.exp >= this.expNeed()){
      this.exp -= this.expNeed();
      this.lv++;
      this.recalcHp();
      this.player.hp = this.player.maxHp;
      UI.toast(`⭐ レベルアップ! Lv${this.lv} (ATK+2 / HP+12)`, 'gold');
      SFX.levelup();
    }
  },

  /* ---------------- インベントリ ---------------- */
  give(key, n){
    this.inv[key] = (this.inv[key] || 0) + (n || 1);
    // ホットバー自動セット (設置物/ツール/武器)
    const it = ITEMS[key];
    if ((it.place != null || it.tool || it.melee) && !this.hotbar.includes(key)){
      const i = this.hotbar.findIndex(s => s == null || !(this.inv[s] > 0));
      if (i >= 0) this.hotbar[i] = key;
    }
    UI.refreshHotbar();
  },
  take(key, n){ this.inv[key] = Math.max(0, (this.inv[key] || 0) - n); },
  heldItem(){
    const k = this.hotbar[this.sel];
    return (k && this.inv[k] > 0) ? k : null;
  },
  selectSlot(i){ this.sel = i; this.mine = null; UI.refreshHotbar(); },

  canCraft(r){
    return Object.entries(r.needs).every(([k, n]) => (this.inv[k] || 0) >= n);
  },
  craft(r){
    if (!this.canCraft(r)) return;
    for (const [k, n] of Object.entries(r.needs)) this.take(k, n);
    this.give(r.out, r.n);
    this.recalcHp();
    SFX.craft();
    UI.toast(`${ITEMS[r.out].icon} ${ITEMS[r.out].name} x${r.n} をクラフト!`);
    if (r.out === 'gate') UI.toast('🌀 次元ゲートを設置して「使う」でボス戦へ!', 'gold');
  },
  useItem(key){
    if (!(this.inv[key] > 0)) return false;
    if (key === 'bdata'){ this.take(key, 1); this.gainExp(40); UI.toast('📀 +40 EXP'); return true; }
    if (key === 'manual'){
      if (this.skillCrit >= 5) return false;
      this.take(key, 1); this.skillCrit++;
      UI.toast(`📘 クリティカル率UP! (${Math.round(this.critChance() * 100)}%)`, 'gold');
      return true;
    }
    return false;
  },
  enhance(key){
    const lv = this.enh[key] || 0;
    if (lv >= ENH_MAX) return;
    const cost = enhCost(lv);
    if (!Object.entries(cost).every(([m, n]) => (this.inv[m] || 0) >= n)) return;
    for (const [m, n] of Object.entries(cost)) this.take(m, n);
    this.enh[key] = lv + 1;
    this.recalcHp();
    SFX.craft();
    UI.toast(`🔩 ${ITEMS[key].name} +${lv + 1}!`, 'gold');
  },

  /* ---------------- ラン管理 ---------------- */
  startRun(){
    this.seed = (Math.random() * 4294967296) >>> 0;
    this.over = genOverworld(this.seed);
    this.void = null;
    this.dim = 'over';
    this.time = 0; this.deaths = 0; this.cleared = false;
    this.inv = {}; this.hotbar = new Array(9).fill(null); this.sel = 0;
    this.lv = 1; this.exp = 0; this.skillCrit = 0; this.enh = {};
    this.dayT = 450; // 正午スタート
    EN.reset();
    this.player = new Player();
    this.recalcHp();
    this.player.hp = this.player.maxHp;
    this.player.spawnAt(this.over.spawn);
    R.meshAll(this.over);
    this.state = 'play';
    CTRL.showTouchUI(true);
    UI.refreshHotbar();
    UI.toast('⛏️ 木を殴って素材集めからスタート!', 'gold');
  },

  /* ---------------- セーブ / つづきから ---------------- */
  hasSave(){ try { return !!localStorage.getItem(this.SAVE_KEY); } catch(e){ return false; } },
  save(){
    try {
      const p = this.player;
      const data = {
        v: 2, seed: this.seed, dim: this.dim, deaths: this.deaths, dayT: this.dayT,
        overEdits: Array.from(this.over.edits.entries()),
        voidEdits: this.void ? Array.from(this.void.edits.entries()) : null,
        player: { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, hp: p.hp },
        inv: this.inv, hotbar: this.hotbar, sel: this.sel,
        lv: this.lv, exp: this.exp, skillCrit: this.skillCrit, enh: this.enh,
        returnPos: this.returnPos,
      };
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
      UI.toast('💾 セーブしました', 'gold');
      return true;
    } catch(e){ UI.toast('セーブ失敗: ' + e.message); return false; }
  },
  deleteSave(){ try { localStorage.removeItem(this.SAVE_KEY); } catch(e){} },
  resume(){
    let s; try { s = JSON.parse(localStorage.getItem(this.SAVE_KEY) || 'null'); } catch(e){ s = null; }
    if (!s){ this.startRun(); return; }
    this.seed = s.seed >>> 0;
    this.over = genOverworld(this.seed);
    if (s.overEdits) this.over.replayEdits(s.overEdits);
    this.void = null;
    if (s.voidEdits){ this.void = genVoid(); this.void.replayEdits(s.voidEdits); }
    this.dim = s.dim || 'over';
    this.deaths = s.deaths || 0; this.dayT = s.dayT != null ? s.dayT : 450;
    this.time = 0; this.cleared = false;
    this.inv = s.inv || {}; this.hotbar = (s.hotbar || new Array(9).fill(null)); this.sel = s.sel || 0;
    this.lv = s.lv || 1; this.exp = s.exp || 0; this.skillCrit = s.skillCrit || 0; this.enh = s.enh || {};
    this.returnPos = s.returnPos || null;
    EN.reset();
    this.player = new Player();
    this.recalcHp();
    const pl = s.player || {};
    this.player.spawnAt([pl.x != null ? pl.x : this.over.spawn[0], pl.y != null ? pl.y : this.over.spawn[1], pl.z != null ? pl.z : this.over.spawn[2]]);
    this.player.yaw = pl.yaw || 0; this.player.pitch = pl.pitch || -0.15;
    this.player.hp = pl.hp != null ? Math.max(1, pl.hp) : this.player.maxHp;
    if (this.dim === 'void'){ if (!this.void){ this.void = genVoid(); } EN.spawnBoss(this.void.wx / 2, 16, this.void.wz / 2); }
    R.meshAll(this.over);
    if (this.void) R.meshAll(this.void);
    this.state = 'play';
    CTRL.showTouchUI(true);
    UI.refreshHotbar();
    UI.toast('▶ 冒険を再開しました', 'gold');
  },

  world(){ return this.dim === 'void' ? this.void : this.over; },

  /* 松明を小ボックス(棒+炎)で描画。炎はゆらぐ */
  drawTorches(w, t){
    if (!w.torches || w.torches.size === 0) return;
    const wy = w.wy, wz = w.wz;
    R.beginBoxes();
    for (const i of w.torches){
      const y = i % wy, tt = (i - y) / wy;
      const z = tt % wz, x = (tt - z) / wz;
      // 棒
      R.drawBox(x + 0.5, y + 0.42, z + 0.5, 0, 0.14, 0.62, 0.14, [0.42, 0.29, 0.16, 1], 0.4);
      // 炎 (揺らぎ)
      const fl = 1 + Math.sin(t * 12 + x * 2.3 + z * 1.7) * 0.16;
      R.drawBox(x + 0.5, y + 0.8, z + 0.5, t * 4 + x, 0.2 * fl, 0.26 * fl, 0.2 * fl, [1.0, 0.72, 0.24, 1], 1);
      R.drawBox(x + 0.5, y + 0.86, z + 0.5, -t * 3 + z, 0.12 * fl, 0.16 * fl, 0.12 * fl, [1.0, 0.93, 0.5, 1], 1);
    }
    R.endBoxes();
  },

  /* ---------------- ダメージ / 死亡 ---------------- */
  damagePlayer(n, cause){
    const p = this.player;
    if (this.state !== 'play') return;
    if (p.hurtCd > 0 && n < 9000) return;
    p.hurtCd = 0.6;
    p.hp -= n;
    this.regenT = 0;
    UI.hurtFlash();
    SFX.hurt();
    if (p.hp <= 0){
      p.hp = 0;
      this.deaths++;
      this.state = 'dead';
      SFX.die();
      UI.showDeath(cause);
    }
  },
  respawn(){
    const p = this.player;
    p.hp = p.maxHp;
    if (this.dim === 'void'){
      p.spawnAt(this.void.spawn);
      const b = EN.boss;
      if (b) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.25); // ボスは少し回復
    } else {
      p.spawnAt(this.over.spawn);
    }
    this.state = 'play';
  },

  /* ---------------- 次元移動 ---------------- */
  enterVoid(){
    this.returnPos = [this.player.x, this.player.y, this.player.z];
    if (!this.void){
      this.void = genVoid();
      R.meshAll(this.void);
    }
    this.dim = 'void';
    EN.clearMobs();
    const c = this.void;
    EN.spawnBoss(c.wx / 2, 16, c.wz / 2);
    this.player.spawnAt(c.spawn);
    SFX.gate();
    UI.toast('🌌 ヴォイド次元 — 次元魔神ヴォイドリア討伐!', 'gold');
  },
  returnFromVoid(){
    this.dim = 'over';
    EN.clearMobs();
    this.player.spawnAt(this.returnPos ? [this.returnPos[0], this.returnPos[1] + 0.2, this.returnPos[2]] : this.over.spawn);
  },
  onBossWin(){
    if (this.state !== 'play') return;
    this.state = 'clear';
    this.cleared = true;
    this.deleteSave(); // クリアしたセーブは破棄
    UI.showClear(this.deaths);
  },

  /* ---------------- 採掘 / 設置 / 攻撃 ---------------- */
  handleActions(input, dt){
    const p = this.player, w = this.world();
    const eye = p.eye(), dir = p.look();
    const REACH = 5;

    // ターゲット
    const entHit = EN.pickTarget(eye, dir, REACH - 0.5);
    const hit = raycastBlock(w, eye[0], eye[1], eye[2], dir[0], dir[1], dir[2], REACH);
    UI.setTargetName(entHit ? (entHit.name || (entHit.kind === 'imp' ? 'ヴォイドインプ' : 'スライム'))
                    : hit ? BLOCKS[hit.id].name : '');
    this.target = hit;
    this.targetEnt = entHit;

    if (this.atkCd > 0) this.atkCd -= dt;

    // 攻撃 (エンティティ優先)
    if (input.attackQueue > 0 || (input.dig && entHit)){
      input.attackQueue = 0;
      if (entHit && this.atkCd <= 0){
        this.atkCd = 0.45;
        const held = this.heldItem();
        const weapon = held && ITEMS[held].melee ? ITEMS[held].melee : 4;
        const crit = Math.random() < this.critChance();
        const dmg = Math.round((weapon + this.atk()) * (crit ? 1.6 : 1));
        EN.damage(entHit, dmg, crit);
        if (crit) UI.toast(`💥 クリティカル! ${dmg}`, 'gold');
        this.mine = null;
      }
    }

    // 採掘
    if (input.dig && !entHit && hit && this.state === 'play'){
      const bl = BLOCKS[hit.id];
      if (bl.hard === Infinity){
        UI.setMineProgress(0);
        this.mine = null;
      } else {
        const held = this.heldItem();
        const tool = held && ITEMS[held].tool;
        const myTier = tool ? tool.tier : 0;
        if (bl.tier > myTier){
          UI.setMineProgress(0);
          this.mine = null;
          UI.setTargetName(`${bl.name} — ⛏️上位ツルハシが必要`);
        } else {
          if (!this.mine || this.mine.x !== hit.x || this.mine.y !== hit.y || this.mine.z !== hit.z){
            this.mine = { x: hit.x, y: hit.y, z: hit.z, progress: 0, total: bl.hard };
          }
          const power = tool ? tool.power : 1;
          this.mine.progress += power * dt;
          if (Math.random() < dt * 8) SFX.dig();
          UI.setMineProgress(this.mine.progress / this.mine.total);
          if (this.mine.progress >= this.mine.total){
            // 破壊!
            w.set(hit.x, hit.y, hit.z, B.AIR);
            EN.burst(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, bl.col || '#999999', 8, 4);
            SFX.breakB();
            if (bl.drop){ this.give(bl.drop, 1); SFX.pickup(); }
            if (bl.exp) this.gainExp(bl.exp);
            /* XEVARION のスターターミッション「ブロックを掘ってみよう」。
               1つ壊した時点で達成（2回目以降は何も起きない）。 */
            try { if (window.XEVA && window.XEVA.completeMission) window.XEVA.completeMission("magicraft_play"); } catch (e) {}
            this.mine = null;
            UI.setMineProgress(0);
          }
        }
      }
    } else {
      this.mine = null;
      UI.setMineProgress(0);
    }

    // 使う / 設置
    if (input.useQueue > 0){
      input.useQueue = 0;
      if (hit){
        const bl = BLOCKS[hit.id];
        if (bl.interact === 'craft'){ UI.openPanel('inv', { table: true }); return; }
        if (bl.interact === 'enhance'){ UI.openPanel('enhance'); return; }
        if (bl.interact === 'gate'){ UI.confirmGate(); return; }
        // 設置
        const held = this.heldItem();
        if (held && ITEMS[held].place != null){
          const px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
          if (!w.inside(px, py, pz)) return;
          const cur = w.get(px, py, pz);
          if (cur !== B.AIR && !BLOCKS[cur].water) return;
          // プレイヤーと重なる位置は不可
          const p2 = this.player;
          const overlap = px + 1 > p2.x - p2.hw && px < p2.x + p2.hw &&
                          pz + 1 > p2.z - p2.hw && pz < p2.z + p2.hw &&
                          py + 1 > p2.y && py < p2.y + p2.h;
          if (overlap && BLOCKS[ITEMS[held].place].solid) return;
          w.set(px, py, pz, ITEMS[held].place);
          this.take(held, 1);
          SFX.place();
          UI.refreshHotbar();
          if (held === 'gate') UI.toast('🌀 ゲート設置! 「使う」で挑戦開始');
        }
      }
    }
  },

  /* ---------------- スライム湧き ---------------- */
  updateSpawns(dt, night){
    if (this.dim !== 'over') return;
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = 3.5;
    const cap = night ? 7 : 4;
    if (EN.mobs.length >= cap) return;
    const p = this.player, w = this.over;
    const a = Math.random() * Math.PI * 2;
    const d = 14 + Math.random() * 16;
    const x = Math.floor(p.x + Math.cos(a) * d), z = Math.floor(p.z + Math.sin(a) * d);
    if (x < 2 || z < 2 || x >= w.wx - 2 || z >= w.wz - 2) return;
    const y = w.heightMap[x * w.wz + z] + 1;
    if (BLOCKS[w.get(x, y - 1, z)].water) return;
    EN.spawnSlime(x + 0.5, y + 0.1, z + 0.5, { hp: 26 + this.lv * 3 });
  },

  /* ---------------- 環境 (昼夜/フォグ) ---------------- */
  updateSky(dt){
    if (this.dim === 'void'){
      R.state.day = 0.8;
      R.state.fogColor = [0.06, 0.02, 0.12];
      R.state.fogNear = 26; R.state.fogFar = 60;
      R.state.sunDir = [0.2, 0.9, 0.3];
      return false;
    }
    // 1周期15分 = 昼10分(600s) + 夜5分(300s)。深夜=0, 正午=CYCLE/2
    const CYCLE = 900, DAWN = 150, DUSK = 750, TR = 90; // TR=薄明の長さ(夜昼の境は常にDAWN/DUSK中央)
    this.dayT = (this.dayT + dt) % CYCLE;
    const t = this.dayT;
    const ss = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    let df; // 0=夜, 1=昼
    if (t < DAWN - TR / 2) df = 0;
    else if (t < DAWN + TR / 2) df = ss((t - (DAWN - TR / 2)) / TR);       // 夜明け
    else if (t < DUSK - TR / 2) df = 1;
    else if (t < DUSK + TR / 2) df = 1 - ss((t - (DUSK - TR / 2)) / TR);   // 日暮れ
    else df = 0;
    const day = 0.22 + 0.78 * df;
    R.state.day = day;
    const lerp = (a, b, k) => a + (b - a) * k;
    R.state.fogColor = [lerp(0.03, 0.55, df), lerp(0.04, 0.76, df), lerp(0.1, 0.97, df)];
    R.state.fogNear = 60; R.state.fogFar = 130;
    const sa = t / CYCLE * Math.PI * 2 - Math.PI / 2; // 正午に太陽が高い
    R.state.sunDir = [Math.cos(sa) * 0.6, Math.max(0.25, Math.sin(sa)), 0.35];
    return df < 0.5; // 夜か?
  },

  /* ---------------- メインループ ---------------- */
  loop(now){
    requestAnimationFrame(t => this.loop(t));
    const dt = Math.min(0.05, (now - (this._last || now)) / 1000 || 0.016);
    this._last = now;

    const w = this.world();
    if (this.state === 'play' || this.state === 'dead' || this.state === 'clear'){
      const night = this.updateSky(dt);

      if (this.state === 'play' && !UI.panelOpen()){
        const input = CTRL.poll();
        this.player.update(w, input, dt, this);
        this.handleActions(input, dt);
        EN.update(w, this.player, dt, this);
        this.updateSpawns(dt, night);
        // 自然回復 (6秒ダメージなしで)
        this.regenT += dt;
        if (this.regenT > 6 && this.player.hp < this.player.maxHp)
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2 * dt);
      }

      R.processDirty(w, 4);
      const p = this.player;
      R.begin(p.eye(), p.yaw, p.pitch);
      R.drawWorld(w);
      EN.draw(now / 1000);
      this.drawTorches(w, now / 1000);
      if (this.state === 'play' && this.target && !this.targetEnt)
        R.drawSelection(this.target.x, this.target.y, this.target.z);
      UI.refreshHUD();
    } else if (this.state === 'title'){
      // タイトル背景: 空色だけ描画
      this.updateSky(dt);
      R.begin([0, 40, 0], now / 8000, -0.2);
    }
  },

  boot(){
    UI.init();
    const canvas = document.getElementById('game');
    if (!R.init(canvas)){
      document.getElementById('panel-layer').innerHTML =
        '<div class="panel small"><div class="p-body center"><h2>😢 WebGL2 非対応</h2><p>このブラウザでは3D表示ができません。<br>最新のChrome / Safari / Edgeでお試しください。</p></div></div>';
      document.getElementById('panel-layer').classList.add('open');
      return;
    }
    CTRL.init(canvas);
    CTRL.showTouchUI(false);
    this.state = 'title';
    UI.showTitle();
    requestAnimationFrame(t => this.loop(t));
  },
};

window.addEventListener('load', () => GAME.boot());
