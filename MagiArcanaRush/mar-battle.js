/* ══════════════════════════════════════════════════════════════
   Magi: Arcana Rush ── バトル

   ── 操作 ──
   キャラをタッチして<b>引っぱって離す</b>と、その向きへ飛んでいく。
   壁・敵・味方にふれるたびに効果が起きて、止まると次の手番へ。

   ── この作品の見どころ（ご指定の5つ）──
     LINK ARTS           味方にふれると連携技。<b>ふれた順番</b>で威力が変わる
     CHAIN               1ショットのヒット数が増えるほど重くなる
     CRITICAL            クリティカル
     ELEMENTAL RESONANCE ちがう属性のリンクを2つつなぐと共鳴が起きる
     ARCANA SKILL        キャラ固有のアクティブ（ゲージ3で使える）
     ARCANA BURST        ゲージをためて撃つ必殺技

   ★ ステータス・属性相性・アビリティは<b>すべて mb-core.js のもの</b>を使う。
     このファイルには「盤面の動き」だけを書く。
   ══════════════════════════════════════════════════════════════ */
"use strict";

let MB = null;             /* いま戦っている盤面（Battle）。戦っていないときは null */
let _marRaf = 0;
/* ★★ 盤面の「世代」。バトルを開始し直すたびに +1 する。
   ── なぜ要るか ──
   手番の終わりは setTimeout で少し待ってから進めている。この待ちの最中に
   バトルをやり直すと、<b>前の盤面あての setTimeout が新しい盤面を動かして</b>しまい、
   撃っていないのに手番が進む・勝手に WAVE が進む、という状態になる。
   タイマーの中で「自分が予約されたときの世代」と見くらべて、ちがえば何もしない。 */
let _marGen = 0;
const MAR_W = 720, MAR_H = 1040;      /* 盤面の内部解像度（見た目は CSS で伸ばす） */
const MAR_FRIC = 0.978;               /* 減速（1ショットがだいたい3秒で止まる） */
const MAR_STOP = 0.55;                /* この速さを下回ったら止まったとみなす */
const MAR_MAXPOW = 34;                /* 引っぱりの最大初速 */
const MAR_BURST_TURNS = 12;           /* Arcana Burst がたまるまでの手番数 */
const MAR_SKILL_TURNS = 3;            /* Arcana Skill がたまるまでの手番数 */

/* ══════════════ 立ち上げ ══════════════ */
function marStartBattle(stage) {
  const ids = marParty();
  if (ids.length < 1) { marToast("編成できるキャラがいません"); return false; }
  const cv = document.getElementById("marCv");
  if (!cv) return false;

  _marGen++;
  MB = {
    gen: _marGen,
    stage: stage, wave: 0, turn: 0, hits: 0, over: false,
    state: "aim",                     /* aim → fly → resolve */
    teamHp: 0, teamMax: 0,
    balls: [], enemies: [], fx: [], pops: [],
    aim: null, shake: 0, t: 0,
    reso: null,                       /* このショットで起きた共鳴 */
    linkEls: [], linkCount: 0,
    burstOn: -1,                      /* Arcana Burst を予約している味方の番号 */
    log: [], gold: 0, exp: 0,
  };
  ids.forEach((id, i) => {
    const st = marStats(id);
    MB.balls.push({
      i: i, id: id, ch: CHARS[id], st: st,
      x: MAR_W * (0.24 + 0.17 * i), y: MAR_H * 0.74,
      vx: 0, vy: 0, r: 46, gauge: 0, skill: 0, moving: false,
      hitFlash: 0, trail: [],
    });
    MB.teamMax += st.hp || 0;
  });
  MB.teamHp = MB.teamMax;
  marSpawnWave(0);
  marFitCanvas();
  cancelAnimationFrame(_marRaf);
  _marRaf = requestAnimationFrame(marLoop);
  marBindBoard();
  marPaintHud();
  return true;
}
function marEndBattle() {
  cancelAnimationFrame(_marRaf);
  _marRaf = 0;
  MB = null;
}

/* ══════════════ WAVE ══════════════ */
function marSpawnWave(n) {
  const s = MB.stage;
  MB.wave = n;
  MB.enemies = [];
  const last = n >= s.waves - 1;
  const mobs = last ? 3 : 4;
  const els = MAR_EL_ORDER;
  for (let j = 0; j < mobs; j++) {
    const el = last ? els[(j + n) % els.length] : els[(j + n * 2) % els.length];
    MB.enemies.push(marMakeEnemy({
      boss: false, el: el,
      hp: Math.round(s.mobHp * (1 + n * 0.25)),
      atk: Math.round(s.atk * 0.55), cd: 4 + (j % 3),
      x: MAR_W * (0.2 + 0.2 * j), y: MAR_H * (0.16 + (j % 2) * 0.12), r: 44,
    }));
  }
  if (last) {
    MB.enemies.push(marMakeEnemy({
      boss: true, el: s.el, hp: s.bossHp, atk: s.atk, cd: 5,
      x: MAR_W * 0.5, y: MAR_H * 0.32, r: 86,
    }));
  }
  MB.fx.push({ t: "wavein", f: 0, dur: 40 });
  marPaintHud();
}
function marMakeEnemy(d) {
  return Object.assign({
    maxhp: d.hp, cdMax: d.cd, flash: 0, dead: false, weak: Math.random() * 6.28,
  }, d);
}

/* ══════════════ 画面のサイズ合わせ ══════════════ */
function marFitCanvas() {
  const cv = document.getElementById("marCv"); if (!cv) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = MAR_W * dpr; cv.height = MAR_H * dpr;
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ══════════════ 入力（引っぱって離す）══════════════ */
let _marBound = false;
function marBindBoard() {
  const cv = document.getElementById("marCv");
  if (!cv || _marBound) return;
  _marBound = true;
  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
    return { x: (t.clientX - r.left) / r.width * MAR_W, y: (t.clientY - r.top) / r.height * MAR_H };
  };
  const down = (e) => {
    if (!MB || MB.over || MB.state !== "aim") return;
    const p = pos(e), b = MB.balls[MB.turn];
    if (!b) return;
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    if (d > b.r * 3.2) return;
    MB.aim = { x0: b.x, y0: b.y, x: p.x, y: p.y };
    e.preventDefault();
  };
  const move = (e) => {
    if (!MB || !MB.aim) return;
    const p = pos(e); MB.aim.x = p.x; MB.aim.y = p.y;
    e.preventDefault();
  };
  const up = () => {
    if (!MB || !MB.aim) return;
    const a = MB.aim; MB.aim = null;
    const dx = a.x0 - a.x, dy = a.y0 - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 14) return;                     /* 引っぱりが短すぎ＝取り消し */
    marLaunch(MB.balls[MB.turn], dx / d, dy / d, Math.min(1, d / 220));
  };
  cv.addEventListener("touchstart", down, { passive: false });
  cv.addEventListener("touchmove", move, { passive: false });
  cv.addEventListener("touchend", up, { passive: true });
  cv.addEventListener("mousedown", down);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
}

function marLaunch(b, ux, uy, power) {
  if (!b || !MB || MB.over || MB.state !== "aim") return;
  MB.state = "fly"; MB.flyF = 0;
  MB.hits = 0; MB.linkEls = []; MB.linkCount = 0; MB.reso = null;
  b.vx = ux * MAR_MAXPOW * (0.55 + power * 0.45);
  b.vy = uy * MAR_MAXPOW * (0.55 + power * 0.45);
  b.moving = true;
  b.hitEnemies = {};
  b.hitAllies = {};
  /* Arcana Burst の予約があれば、飛び出した瞬間に発動 */
  if (MB.burstOn === b.i) { marFireBurst(b); MB.burstOn = -1; }
  try { SFX.launch(); } catch (e) {}
  marPaintHud();
}

/* ══════════════ ダメージ ══════════════ */
function marDealDamage(b, e, mul, tag) {
  if (!e || e.dead) return 0;
  const atk = (b.st.atk || 0);
  const em = marElemMult(b.ch.el, e.el, !!MB.reso);
  const chain = marChainMul(MB.hits);
  const crit = Math.random() * 100 < marCrit(b.id);
  const cd = crit ? marCritDmg(b.id) / 100 : 1;
  const boss = e.boss ? 1 : 1.15;
  let dmg = Math.round(atk * 0.42 * mul * em * chain * cd * boss);
  dmg = Math.max(1, dmg);
  e.hp -= dmg; e.flash = 10;
  MB.hits++;
  MB.pops.push({ x: e.x, y: e.y - e.r * 0.6, f: 0, dur: 34,
    txt: marFmt(dmg), c: crit ? "#ffe36a" : (em > 1 ? "#7dffb0" : em < 1 ? "#9aa6c8" : "#ffffff"),
    big: crit || !!tag });
  if (crit) marBanner("CRITICAL!", "#ffe36a");
  if (em > 1) marBanner("WEAK!", "#7dffb0", true);
  if (e.hp <= 0) {
    e.dead = true;
    MB.fx.push({ t: "boom", x: e.x, y: e.y, f: 0, dur: 26, r: e.r * 2.4, c: marElColor(e.el) });
    try { SFX.hit(); } catch (err) {}
  }
  return dmg;
}

/* ══════════════ Link Arts ══════════════ */
function marLinkArts(owner, mate) {
  const n = MB.linkCount;
  MB.linkCount++;
  const mul = marLinkMul(n) * 1.55;
  const el = mate.ch.el;
  /* 共鳴の判定: このショットでふれた属性に、ちがう属性が2つそろったら発動 */
  if (MB.linkEls.indexOf(el) < 0) MB.linkEls.push(el);
  marBanner("LINK ARTS ×" + (n + 1), marElColor(el));
  MB.fx.push({ t: "link", x1: owner.x, y1: owner.y, x2: mate.x, y2: mate.y, f: 0, dur: 26, c: marElColor(el) });
  /* リンクの実体: ふれた味方から、近い敵へ光の弾が飛ぶ */
  const targets = MB.enemies.filter((e) => !e.dead)
    .sort((a, c) => Math.hypot(a.x - mate.x, a.y - mate.y) - Math.hypot(c.x - mate.x, c.y - mate.y))
    .slice(0, 3);
  targets.forEach((e, k) => {
    MB.fx.push({ t: "beam", x1: mate.x, y1: mate.y, x2: e.x, y2: e.y, f: -k * 3, dur: 20, c: marElColor(el) });
    marDealDamage(mate, e, mul * (k === 0 ? 1 : 0.7), "link");
  });
  /* 2属性そろったら共鳴 */
  if (!MB.reso && MB.linkEls.length >= 2) {
    const r = marResoOf(MB.linkEls[0], MB.linkEls[1]);
    if (r) marFireResonance(r, owner);
  }
  mate.gauge = Math.min(MAR_BURST_TURNS, mate.gauge + 0.5);
  try { SFX.friend(); } catch (e) {}
}

/* ══════════════ Elemental Resonance ══════════════ */
function marFireResonance(r, owner) {
  MB.reso = r;
  marBanner("ELEMENTAL RESONANCE — " + r.nm, r.c, false, true);
  MB.fx.push({ t: "reso", x: owner.x, y: owner.y, f: 0, dur: 46, c: r.c });
  MB.shake = Math.max(MB.shake, 16);
  const alive = MB.enemies.filter((e) => !e.dead);
  if (r.kind === "heal") {
    MB.teamHp = Math.min(MB.teamMax, MB.teamHp + Math.round(MB.teamMax * 0.14));
    marBanner("HEAL +14%", "#7dffb0", true);
  }
  if (r.kind === "slow") alive.forEach((e) => { e.cd = Math.min(e.cdMax, e.cd + 1); });
  if (r.kind === "gauge") MB.balls.forEach((b) => { b.gauge = Math.min(MAR_BURST_TURNS, b.gauge + 1); });
  alive.forEach((e, k) => {
    const mul = r.pow * (r.kind === "chain" ? 1 + k * 0.22 : 1);
    MB.fx.push({ t: "beam", x1: owner.x, y1: owner.y, x2: e.x, y2: e.y, f: -k * 2, dur: 24, c: r.c });
    marDealDamage(owner, e, mul, "reso");
  });
  try { SFX.crit(); } catch (e) {}
}

/* ══════════════ Arcana Skill（キャラ固有のアクティブ）══════════════ */
function marFireSkill(i) {
  if (!MB || MB.over || MB.state !== "aim") return;
  const b = MB.balls[i]; if (!b || b.skill < MAR_SKILL_TURNS) return;
  b.skill = 0;
  const sk = (typeof shotSkillOf === "function") ? shotSkillOf(b.id) : null;
  const nm = sk ? sk.nm : (b.ch.fsName || "アルカナスキル");
  marBanner("ARCANA SKILL — " + nm, marElColor(b.ch.el), false, true);
  MB.fx.push({ t: "reso", x: b.x, y: b.y, f: 0, dur: 40, c: marElColor(b.ch.el) });
  /* 効果は「まわりの敵をまとめて撃つ」——キャラごとの見た目は色で出す */
  MB.enemies.filter((e) => !e.dead).forEach((e, k) => {
    MB.fx.push({ t: "beam", x1: b.x, y1: b.y, x2: e.x, y2: e.y, f: -k * 2, dur: 20, c: marElColor(b.ch.el) });
    marDealDamage(b, e, 2.4, "skill");
  });
  MB.shake = Math.max(MB.shake, 12);
  try { SFX.ss(); } catch (e) {}
  marPaintHud();
}
window.marFireSkill = marFireSkill;

/* ══════════════ Arcana Burst ══════════════ */
function marToggleBurst(i) {
  if (!MB || MB.over || MB.state !== "aim") return;
  const b = MB.balls[i]; if (!b) return;
  if (i !== MB.turn) { marToast("Arcana Burst は<b>自分の手番</b>で撃てます"); return; }
  if (b.gauge < MAR_BURST_TURNS) { marToast("ゲージがまだたまっていません"); return; }
  MB.burstOn = (MB.burstOn === i) ? -1 : i;
  marToast(MB.burstOn === i ? "⚡ ARCANA BURST 予約！ そのまま引っぱって放つと発動します" : "予約を取り消しました");
  marPaintHud();
}
window.marToggleBurst = marToggleBurst;
function marFireBurst(b) {
  b.gauge = 0;
  marBanner("ARCANA BURST — " + (b.ch.ssName || ""), marElColor(b.ch.el), false, true);
  MB.fx.push({ t: "burst", x: b.x, y: b.y, f: 0, dur: 62, c: marElColor(b.ch.el) });
  MB.shake = Math.max(MB.shake, 26);
  /* 自強化（このショットのあいだ与ダメージが増える）＋ 敵全体への一撃 */
  b.buff = 2.2;
  MB.enemies.filter((e) => !e.dead).forEach((e, k) => {
    MB.fx.push({ t: "beam", x1: b.x, y1: b.y, x2: e.x, y2: e.y, f: -k * 2, dur: 26, c: marElColor(b.ch.el) });
    marDealDamage(b, e, 5.2, "burst");
  });
  try { SFX.ss(); } catch (e) {}
}

/* ══════════════ 1フレーム ══════════════ */
function marLoop() {
  _marRaf = requestAnimationFrame(marLoop);
  if (!MB) return;
  MB.t++;
  if (MB.state === "fly") marStep();
  marDraw();
}

function marStep() {
  const b = MB.balls[MB.turn];
  if (!b) return;
  const sub = 3;                                  /* 1フレームを3回に分けて動かす（すり抜け防止） */
  for (let s = 0; s < sub; s++) {
    b.x += b.vx / sub; b.y += b.vy / sub;
    /* 壁 */
    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); marWallFx(b); }
    if (b.x > MAR_W - b.r) { b.x = MAR_W - b.r; b.vx = -Math.abs(b.vx); marWallFx(b); }
    if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); marWallFx(b); }
    if (b.y > MAR_H - b.r) { b.y = MAR_H - b.r; b.vy = -Math.abs(b.vy); marWallFx(b); }
    /* 敵 */
    MB.enemies.forEach((e) => {
      if (e.dead) return;
      const dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy);
      if (d > e.r + b.r) { b.hitEnemies[e.id2 || (e.id2 = Math.random())] = 0; return; }
      const mul = (b.buff || 1);
      marDealDamage(b, e, 1 * mul, "");
      /* 反射キャラは押し返される。貫通キャラはそのまま通り抜ける */
      if (b.ch.shot !== "pierce") {
        const nx = dx / (d || 1), ny = dy / (d || 1);
        const dot = b.vx * nx + b.vy * ny;
        b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny;
        b.x = e.x - nx * (e.r + b.r + 1); b.y = e.y - ny * (e.r + b.r + 1);
      }
    });
    /* 味方（Link Arts） */
    MB.balls.forEach((m) => {
      if (m === b) return;
      const d = Math.hypot(m.x - b.x, m.y - b.y);
      const key = "m" + m.i;
      if (d > m.r + b.r) { b.hitAllies[key] = 0; return; }
      if (b.hitAllies[key]) return;               /* 同じ味方で連続発動しない */
      b.hitAllies[key] = 1;
      marLinkArts(b, m);
    });
  }
  b.trail.push({ x: b.x, y: b.y });
  if (b.trail.length > 14) b.trail.shift();
  b.vx *= MAR_FRIC; b.vy *= MAR_FRIC;
  /* ★ 保険: 何かの拍子に止まらなくなっても、必ず手番が進むようにする
     （止まらない＝ずっと自分の番、になって二度と遊べなくなるため） */
  MB.flyF = (MB.flyF | 0) + 1;
  if (Math.hypot(b.vx, b.vy) < MAR_STOP || MB.flyF > 900) {
    MB.flyF = 0;
    b.vx = b.vy = 0; b.moving = false; b.buff = 1; b.trail = [];
    marEndTurn();
  }
}
function marWallFx(b) {
  MB.fx.push({ t: "spark", x: b.x, y: b.y, f: 0, dur: 12, c: marElColor(b.ch.el) });
}

/* ══════════════ 手番の終わり ══════════════ */
function marEndTurn() {
  MB.state = "resolve";
  /* WAVE クリア */
  if (MB.enemies.every((e) => e.dead)) {
    if (MB.wave + 1 >= MB.stage.waves) { marWin(); return; }
    const g1 = MB.gen;
    setTimeout(() => { if (MB && MB.gen === g1 && !MB.over) { marSpawnWave(MB.wave + 1); marNextTurn(); } }, 520);
    return;
  }
  /* 敵の行動 */
  let dmg = 0;
  MB.enemies.forEach((e) => {
    if (e.dead) return;
    e.cd--;
    if (e.cd > 0) return;
    e.cd = e.cdMax;
    const d = Math.round(e.atk * (0.9 + Math.random() * 0.2));
    dmg += d;
    MB.fx.push({ t: "enemyatk", x: e.x, y: e.y, f: 0, dur: 26, c: marElColor(e.el) });
  });
  if (dmg > 0) {
    MB.teamHp -= dmg;
    MB.pops.push({ x: MAR_W / 2, y: MAR_H * 0.86, f: 0, dur: 36, txt: "-" + marFmt(dmg), c: "#ff6f91", big: true });
    MB.shake = Math.max(MB.shake, 12);
    if (MB.teamHp <= 0) { MB.teamHp = 0; marLose(); return; }
  }
  const g2 = MB.gen;
  setTimeout(() => { if (MB && MB.gen === g2 && !MB.over) marNextTurn(); }, 420);
}
function marNextTurn() {
  MB.turn = (MB.turn + 1) % MB.balls.length;
  MB.balls.forEach((b) => {
    b.gauge = Math.min(MAR_BURST_TURNS, b.gauge + 1);
    b.skill = Math.min(MAR_SKILL_TURNS, b.skill + 1);
  });
  MB.state = "aim";
  MB.flyF = 0;
  marPaintHud();
}

/* ══════════════ 勝ち負け ══════════════ */
function marWin() {
  MB.over = true; MB.state = "over";
  const s = MB.stage;
  const first = !MAR.clear[s.id];
  MAR.clear[s.id] = (MAR.clear[s.id] | 0) + 1;
  MAR.plays = (MAR.plays | 0) + 1;
  marSave();
  const gold = Math.round(s.gold * (first ? 2 : 1));
  try { DB.gold = (DB.gold | 0) + gold; save(); } catch (e) {}
  let up = null;
  try { up = XEVA.status.addExp(s.exp, "Magi: Arcana Rush"); } catch (e) {}
  try { SFX.win(); } catch (e) {}
  marShowResult(true, { gold: gold, exp: s.exp, first: first, up: up });
}
function marLose() {
  MB.over = true; MB.state = "over";
  try { SFX.lose(); } catch (e) {}
  marShowResult(false, {});
}

/* ══════════════ 演出の文字 ══════════════ */
function marBanner(txt, c, small, big) {
  if (!MB) return;
  MB.log.unshift({ txt: txt, c: c, f: 0, dur: big ? 78 : small ? 40 : 56, big: !!big });
  if (MB.log.length > 4) MB.log.pop();
}

/* ══════════════ 描画 ══════════════ */
function marDraw() {
  const cv = document.getElementById("marCv"); if (!cv) return;
  const g = cv.getContext("2d");
  g.save();
  if (MB.shake > 0) {
    g.translate((Math.random() - 0.5) * MB.shake, (Math.random() - 0.5) * MB.shake);
    MB.shake *= 0.86; if (MB.shake < 0.5) MB.shake = 0;
  }
  /* 背景（魔法陣） */
  const bg = g.createLinearGradient(0, 0, 0, MAR_H);
  bg.addColorStop(0, "#0a0f2e"); bg.addColorStop(0.5, "#141a44"); bg.addColorStop(1, "#0a0d26");
  g.fillStyle = bg; g.fillRect(-40, -40, MAR_W + 80, MAR_H + 80);
  marDrawSigil(g);

  /* エフェクト（下） */
  MB.fx = MB.fx.filter((f) => f.f++ < f.dur);
  MB.fx.forEach((f) => marDrawFx(g, f));

  /* 敵 */
  MB.enemies.forEach((e) => { if (!e.dead) marDrawEnemy(g, e); });

  /* 味方 */
  MB.balls.forEach((b, i) => marDrawBall(g, b, i === MB.turn));

  /* 引っぱりの線 */
  if (MB.aim) marDrawAim(g);

  /* ダメージの数字 */
  MB.pops = MB.pops.filter((p) => p.f++ < p.dur);
  MB.pops.forEach((p) => {
    const a = 1 - p.f / p.dur;
    g.globalAlpha = a;
    g.font = "900 " + (p.big ? 44 : 32) + "px 'Orbitron','Noto Sans JP',sans-serif";
    g.textAlign = "center";
    g.lineWidth = 6; g.strokeStyle = "rgba(0,0,0,.55)";
    g.strokeText(p.txt, p.x, p.y - p.f * 0.8);
    g.fillStyle = p.c; g.fillText(p.txt, p.x, p.y - p.f * 0.8);
    g.globalAlpha = 1;
  });

  /* 演出の帯 */
  MB.log = MB.log.filter((l) => l.f++ < l.dur);
  MB.log.forEach((l, k) => {
    const a = Math.min(1, (1 - l.f / l.dur) * 2);
    g.globalAlpha = a;
    /* ★ 「ELEMENTAL RESONANCE — VOID COLLAPSE」のような長い文字は、
       そのままだと盤面からはみ出して両端が切れる。<b>入る大きさまで縮める</b>。 */
    let fs = l.big ? 40 : 28;
    g.font = "900 " + fs + "px 'Orbitron','Noto Sans JP',sans-serif";
    const room = MAR_W - 48;
    const w0 = g.measureText(l.txt).width;
    if (w0 > room) {
      fs = Math.max(15, Math.floor(fs * room / w0));
      g.font = "900 " + fs + "px 'Orbitron','Noto Sans JP',sans-serif";
    }
    g.textAlign = "center";
    const y = MAR_H * 0.40 + k * 46;
    g.lineWidth = 8; g.strokeStyle = "rgba(0,0,0,.6)";
    g.strokeText(l.txt, MAR_W / 2, y);
    const lg = g.createLinearGradient(0, y - fs * 0.8, 0, y + 8);
    lg.addColorStop(0, "#ffffff"); lg.addColorStop(1, l.c);
    g.fillStyle = lg; g.fillText(l.txt, MAR_W / 2, y);
    g.globalAlpha = 1;
  });
  g.restore();
}

function marDrawSigil(g) {
  const cx = MAR_W / 2, cy = MAR_H * 0.42, R = MAR_W * 0.42;
  g.save();
  g.translate(cx, cy);
  g.rotate(MB.t * 0.0016);
  g.strokeStyle = "rgba(150,180,255,.10)"; g.lineWidth = 2;
  g.beginPath(); g.arc(0, 0, R, 0, 6.2832); g.stroke();
  g.beginPath(); g.arc(0, 0, R * 0.72, 0, 6.2832); g.stroke();
  g.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i * 2 / 7) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * R * 0.86, y = Math.sin(a) * R * 0.86;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath(); g.stroke();
  g.restore();
  /* 星 */
  g.fillStyle = "rgba(255,255,255,.5)";
  for (let i = 0; i < 46; i++) {
    const x = ((i * 137) % MAR_W), y = ((i * 271) % MAR_H);
    const a = 0.2 + Math.abs(Math.sin(MB.t * 0.012 + i)) * 0.5;
    g.globalAlpha = a; g.fillRect(x, y, 2, 2);
  }
  g.globalAlpha = 1;
}

function marDrawEnemy(g, e) {
  const el = marEl(e.el);
  g.save();
  /* 本体 */
  const grd = g.createRadialGradient(e.x - e.r * 0.3, e.y - e.r * 0.35, e.r * 0.2, e.x, e.y, e.r);
  grd.addColorStop(0, el.g); grd.addColorStop(1, el.c);
  g.fillStyle = grd;
  g.beginPath(); g.arc(e.x, e.y, e.r, 0, 6.2832); g.fill();
  g.lineWidth = e.boss ? 5 : 3;
  g.strokeStyle = e.flash > 0 ? "#ffffff" : "rgba(255,255,255,.55)";
  g.stroke();
  if (e.flash > 0) {
    g.globalAlpha = e.flash / 10 * 0.6; g.fillStyle = "#fff";
    g.beginPath(); g.arc(e.x, e.y, e.r, 0, 6.2832); g.fill();
    g.globalAlpha = 1; e.flash--;
  }
  /* 属性の文字 */
  g.fillStyle = "rgba(10,14,40,.9)";
  g.font = "900 " + Math.round(e.r * 0.52) + "px 'Noto Sans JP',sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(el.ja, e.x, e.y);
  g.textBaseline = "alphabetic";
  /* HPバー */
  const w = e.r * 2.1, h = e.boss ? 9 : 6;
  const p = Math.max(0, e.hp / e.maxhp);
  g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(e.x - w / 2, e.y + e.r + 8, w, h);
  g.fillStyle = e.boss ? "#ff3d8a" : "#7dffb0";
  g.fillRect(e.x - w / 2, e.y + e.r + 8, w * p, h);
  /* 攻撃までの手番 */
  g.fillStyle = e.cd <= 1 ? "#ff6f91" : "rgba(255,255,255,.8)";
  g.font = "900 20px 'Orbitron',sans-serif"; g.textAlign = "center";
  g.fillText(e.cd, e.x, e.y - e.r - 10);
  g.restore();
}

function marDrawBall(g, b, cur) {
  const el = marEl(b.ch.el);
  g.save();
  /* 軌跡 */
  b.trail.forEach((t, i) => {
    g.globalAlpha = (i / b.trail.length) * 0.34;
    g.fillStyle = el.c;
    g.beginPath(); g.arc(t.x, t.y, b.r * (0.3 + i / b.trail.length * 0.6), 0, 6.2832); g.fill();
  });
  g.globalAlpha = 1;
  /* 本体 */
  const grd = g.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.15, b.x, b.y, b.r);
  grd.addColorStop(0, "#ffffff"); grd.addColorStop(0.55, el.g); grd.addColorStop(1, el.c);
  g.fillStyle = grd;
  g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.2832); g.fill();
  g.lineWidth = cur ? 5 : 3;
  g.strokeStyle = cur ? "#ffffff" : "rgba(255,255,255,.45)";
  g.stroke();
  if (cur) {
    g.globalAlpha = 0.35 + Math.abs(Math.sin(MB.t * 0.08)) * 0.4;
    g.lineWidth = 3; g.strokeStyle = "#fff";
    g.beginPath(); g.arc(b.x, b.y, b.r + 12 + Math.abs(Math.sin(MB.t * 0.06)) * 6, 0, 6.2832); g.stroke();
    g.globalAlpha = 1;
  }
  /* 名前の1文字 */
  g.fillStyle = "rgba(10,14,40,.92)";
  g.font = "900 30px 'Noto Sans JP',sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText((b.ch.nm || "?")[0], b.x, b.y);
  g.textBaseline = "alphabetic";
  g.restore();
}

function marDrawAim(g) {
  const b = MB.balls[MB.turn];
  const dx = MB.aim.x0 - MB.aim.x, dy = MB.aim.y0 - MB.aim.y;
  const d = Math.hypot(dx, dy);
  if (d < 6) return;
  const ux = dx / d, uy = dy / d;
  const pow = Math.min(1, d / 220);
  g.save();
  /* 予測線（壁で1回だけ跳ね返るところまで描く） */
  g.setLineDash([14, 12]);
  g.lineWidth = 6;
  const grd = g.createLinearGradient(b.x, b.y, b.x + ux * 520, b.y + uy * 520);
  grd.addColorStop(0, "rgba(255,255,255,.95)");
  grd.addColorStop(1, marElColor(b.ch.el) + "00");
  g.strokeStyle = grd;
  g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x + ux * 520 * pow, b.y + uy * 520 * pow); g.stroke();
  g.setLineDash([]);
  /* 矢印 */
  const ax = b.x + ux * 520 * pow, ay = b.y + uy * 520 * pow;
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.moveTo(ax + ux * 22, ay + uy * 22);
  g.lineTo(ax - uy * 14 - ux * 10, ay + ux * 14 - uy * 10);
  g.lineTo(ax + uy * 14 - ux * 10, ay - ux * 14 - uy * 10);
  g.closePath(); g.fill();
  /* 力のゲージ */
  g.fillStyle = "rgba(255,255,255,.22)";
  g.fillRect(b.x - 60, b.y + b.r + 16, 120, 10);
  g.fillStyle = pow > 0.85 ? "#ffe36a" : "#8ad4ff";
  g.fillRect(b.x - 60, b.y + b.r + 16, 120 * pow, 10);
  g.restore();
}

function marDrawFx(g, f) {
  const p = f.f / f.dur;
  g.save();
  if (f.t === "beam" && f.f >= 0) {
    g.globalAlpha = 1 - p;
    g.lineWidth = 10 * (1 - p) + 2;
    g.strokeStyle = f.c;
    g.shadowColor = f.c; g.shadowBlur = 22;
    g.beginPath(); g.moveTo(f.x1, f.y1); g.lineTo(f.x2, f.y2); g.stroke();
  } else if (f.t === "link" && f.f >= 0) {
    g.globalAlpha = 1 - p;
    g.lineWidth = 7;
    g.strokeStyle = "#ffffff";
    g.shadowColor = f.c; g.shadowBlur = 26;
    g.beginPath(); g.moveTo(f.x1, f.y1); g.lineTo(f.x2, f.y2); g.stroke();
  } else if (f.t === "boom") {
    g.globalAlpha = 1 - p;
    g.strokeStyle = f.c; g.lineWidth = 8 * (1 - p) + 1;
    g.beginPath(); g.arc(f.x, f.y, f.r * p, 0, 6.2832); g.stroke();
  } else if (f.t === "spark") {
    g.globalAlpha = 1 - p; g.fillStyle = f.c;
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + f.f * 0.2;
      g.beginPath(); g.arc(f.x + Math.cos(a) * 26 * p, f.y + Math.sin(a) * 26 * p, 4 * (1 - p), 0, 6.2832); g.fill();
    }
  } else if (f.t === "reso" || f.t === "burst") {
    g.globalAlpha = (1 - p) * 0.9;
    const R = (f.t === "burst" ? 620 : 400) * p;
    g.strokeStyle = f.c; g.lineWidth = 14 * (1 - p) + 2;
    g.shadowColor = f.c; g.shadowBlur = 30;
    g.beginPath(); g.arc(f.x, f.y, R, 0, 6.2832); g.stroke();
    g.strokeStyle = "#ffffff"; g.lineWidth = 5 * (1 - p);
    g.beginPath(); g.arc(f.x, f.y, R * 0.62, 0, 6.2832); g.stroke();
  } else if (f.t === "enemyatk") {
    g.globalAlpha = (1 - p) * 0.7;
    g.strokeStyle = f.c; g.lineWidth = 6;
    g.beginPath(); g.arc(f.x, f.y, 30 + 90 * p, 0, 6.2832); g.stroke();
  } else if (f.t === "wavein") {
    g.globalAlpha = (1 - p) * 0.5;
    g.fillStyle = "#8ad4ff";
    g.fillRect(0, MAR_H * 0.44 - 4, MAR_W, 8 * (1 - p) + 1);
  }
  g.restore();
}
