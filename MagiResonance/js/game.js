/* ============================================================
   MagiResonance — メインゲーム（王道RPG型）
   ・コマンドバトル(DQB) / 職業とじゅもん / そうび購入 / 宿屋 /
     ぜんめつで所持金半分 / ひかりのオーブ収集 / モンスター図鑑
   ============================================================ */
"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const SAVE_KEY = "magires_dq1";
const CHARS_IMG = "../chars/";
/* 保存された charFile は移籍前の古いパスのことがあるので正規化してから使う */
function canonCF(cf, charId) { return (window.XEVA && window.XEVA.canonCharFile) ? window.XEVA.canonCharFile(cf, charId) : cf; }

/* ── アカウントガード ── */
let ACC = null;
try { ACC = JSON.parse(localStorage.getItem("xeva_account_v1") || "null"); } catch (e) {}
if (!ACC || !ACC.setupDone) location.replace("../index.html");
function localUid() {
  let u = localStorage.getItem("magires_uid");
  if (!u) { u = "local_" + Math.random().toString(36).slice(2, 10); localStorage.setItem("magires_uid", u); }
  return u;
}
function myUid() { return (ACC && (ACC.xvUid || ACC.mlUid)) || localUid(); }
function myName() { return (ACC && ACC.name) || "ゆうしゃ"; }
/* ★ 2026-08-10 キャラ画像は XEVARION 直下の img/ に集約したので、
   保存されている古いパス（"s0/Hina.png" など）は必ず正規化してから使う。 */
function myCharFile() { return canonCF((ACC && ACC.charFile) || "", ACC && ACC.charId) || ""; }

/* ══════════ セーブ ══════════ */
let S = {
  xp: {}, hp: {}, mp: {}, eq: {},           // eq[id] = {w,a,s}
  party: [], items: { yakusou: 3 },
  story: {}, storyRead: {}, orbs: 0,
  gold: 120, tower: 0, expDone: 0, mdex: {},
  arena: { rating: 1000, best: 1000, wins: 0, losses: 0, atkDay: "", atkN: 0 },
  daily: { date: "", c: {} }, weekly: { wk: "", c: {} },
  ach: {}, xevaKeys: {}, curTitle: "",
  worldPos: null, introSeen: false,
};
try { S = Object.assign(S, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
["xp", "hp", "mp", "eq", "items", "story", "storyRead", "mdex", "ach", "xevaKeys"].forEach((k) => { if (!S[k]) S[k] = {}; });
if (!S.arena) S.arena = { rating: 1000, best: 1000, wins: 0, losses: 0, atkDay: "", atkN: 0 };
if (!S.daily) S.daily = { date: "", c: {} };
if (!S.weekly) S.weekly = { wk: "", c: {} };
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

const today = () => new Date().toLocaleDateString("sv-SE");
function weekKeyLocal() {
  const d = new Date(); const onejan = new Date(d.getFullYear(), 0, 1);
  return d.getFullYear() + "-w" + Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
}
function rollDaily() {
  if (S.daily.date !== today()) { S.daily = { date: today(), c: {} }; S.arena.atkDay = today(); S.arena.atkN = 0; save(); }
  if (S.weekly.wk !== weekKeyLocal()) { S.weekly = { wk: weekKeyLocal(), c: {} }; save(); }
}

/* ══════════ XEVA ══════════ */
function xevaBal() { return window.XEVA ? XEVA.getBalance() : 0; }
function awardXeva(key, amt, label) {
  if (S.xevaKeys[key]) return false;
  S.xevaKeys[key] = 1; save();
  if (window.XEVA) { XEVA.add(amt, "MagiResonance: " + label); toast(`<img src="../../XEVA.png" class="ti">+${amt} XEVA — ${label}`); }
  refreshTop();
  return true;
}

/* ══════════ キャラクター（なかま） ══════════ */
function gachaData() { try { return JSON.parse(localStorage.getItem("xeva_gacha_v1") || "{}"); } catch (e) { return {}; } }
function ownedIds() {
  const g = gachaData(), set = {};
  Object.keys(g.owned || {}).forEach((id) => { if (g.owned[id]) set[id] = true; });
  if (ACC && ACC.charId) set[ACC.charId] = true;
  return set;
}
function allChars() { return (window.XEVA && XEVA.CHARS || []).filter((c) => c.file); }
function charById(id) { return allChars().find((c) => c.id === id) || null; }
function dupeOf(id) { const g = gachaData(); return Math.min(4, (g.dupes && g.dupes[id]) || 0); }
function imgOf(ch) { return CHARS_IMG + ch.file; }
function jobOf(ch) { return JOBS_ORDER[hashN(ch.id, 101) % 5]; }
function lvOf(id) { return lvFromXp(S.xp[id] || 0); }

/* ステータス: 基礎(ハッシュ) × 成長(Lv) × 職業 × レア × 凸 */
function statsOf(ch, lvOpt) {
  const lv = lvOpt != null ? lvOpt : lvOf(ch.id);
  const J = JOBS[jobOf(ch)];
  const ssr = ch.rarity === "SSR" ? 1.12 : 1;
  const dp = 1 + 0.03 * dupeOf(ch.id);
  const h = (n) => hashN(ch.id, n);
  const st = (base, grow, mult) => Math.max(1, Math.round((base + (lv - 1) * grow) * mult * ssr * dp));
  return {
    lv,
    mhp: st(24 + h(7) % 12, 4.4, J.hp),
    mmp: st(6 + h(31) % 6, 1.7, J.mp),
    atk: st(8 + h(131) % 5, 1.35, J.atk),   // ちから
    def: st(7 + h(977) % 5, 1.15, J.def),   // みのまもり
    agi: st(6 + h(401) % 6, 0.95, J.agi),
    wis: st(6 + h(547) % 6, 1.05, J.wis),
  };
}
function eqOf(id) { return S.eq[id] || {}; }
function atkPower(ch, st) { const w = weaponById(eqOf(ch.id).w); return st.atk + (w ? w.atk : 0); }   // こうげき力
function defPower(ch, st) {
  const a = armorById(eqOf(ch.id).a), sh = shieldById(eqOf(ch.id).s);
  return st.def + (a ? a.def : 0) + (sh ? sh.def : 0);                                                // しゅび力
}
function spellsOf(id, lvOpt) {
  const ch = charById(id); if (!ch) return [];
  const lv = lvOpt != null ? lvOpt : lvOf(id);
  return (LEARN[jobOf(ch)] || []).filter((e) => e.s && e.lv <= lv).map((e) => e.s);
}
function artsOf(id, lvOpt) {
  const ch = charById(id); if (!ch) return [];
  const lv = lvOpt != null ? lvOpt : lvOf(id);
  return (LEARN[jobOf(ch)] || []).filter((e) => e.a && e.lv <= lv).map((e) => e.a);
}
/* 現在HP/MP（持ち越し） */
function curHp(id) { const ch = charById(id); if (!ch) return 0; const m = statsOf(ch).mhp; const v = S.hp[id]; return v == null ? m : Math.max(0, Math.min(m, v)); }
function curMp(id) { const ch = charById(id); if (!ch) return 0; const m = statsOf(ch).mmp; const v = S.mp[id]; return v == null ? m : Math.max(0, Math.min(m, v)); }
function setHpMp(id, hp, mp) { S.hp[id] = hp; S.mp[id] = mp; }
function healAll(full) {
  validParty().forEach((id) => {
    const ch = charById(id), st = statsOf(ch);
    S.hp[id] = st.mhp; S.mp[id] = st.mmp;
  });
  save();
}
function validParty() { const o = ownedIds(); return (S.party || []).filter((id) => o[id] && charById(id)).slice(0, 4); }
function partyAlive() { return validParty().some((id) => curHp(id) > 0); }

/* バトル用ユニット化 */
function allyUnit(id, lvOpt, eqOpt) {
  const ch = charById(id); if (!ch) return null;
  const lv = lvOpt != null ? lvOpt : lvOf(id);
  const st = statsOf(ch, lv);
  const eq = eqOpt || eqOf(id);
  const w = weaponById(eq.w), a = armorById(eq.a), sh = shieldById(eq.s);
  return {
    id, nm: ch.name, img: imgOf(ch), job: jobOf(ch), lv,
    mhp: st.mhp, hp: lvOpt != null ? st.mhp : curHp(id),
    mmp: st.mmp, mp: lvOpt != null ? st.mmp : curMp(id),
    atk: st.atk + (w ? w.atk : 0), def: st.def + (a ? a.def : 0) + (sh ? sh.def : 0),
    agi: st.agi, wis: st.wis, crit: JOBS[jobOf(ch)].crit,
    spells: spellsOf(id, lv), arts: artsOf(id, lv),
  };
}
function partyUnits() { return validParty().map((id) => allyUnit(id)).filter((u) => u && u.hp > 0); }

/* ══════════ モンスター生成 ══════════ */
function monsterUnit(m, lv, opt) {
  opt = opt || {};
  const b = opt.boss ? 1 : 0;
  return {
    key: m.key || null, nm: m.nm, ic: m.ic, lv,
    mhp: Math.round((16 + lv * 6.5) * (b ? 7.5 : 1) * (opt.hpMul || 1)),
    atk: Math.round((11 + lv * 2.5) * (b ? 1.2 : 1)),
    def: Math.round(7 + lv * 1.7),
    agi: Math.round(6 + lv * 1.3),
    wis: lv, crit: 0.02,
    ai: m.ai || "atk", boss: !!opt.boss,
    exp: Math.round((3 + lv * 2.4) * (b ? 9 : 1)),
    gold: Math.round((2 + lv * 1.7) * (b ? 9 : 1) * (0.8 + Math.random() * 0.4)),
  };
}
function stageLv(ch, stg) { return Math.max(1, Math.round(ch * 2.5 + stg * 0.3 - 1.5)); }
function stageEnemies(ch, stg) {
  const rng = seededRng("st" + ch + "-" + stg);
  const lv = stageLv(ch, stg);
  const tier = Math.min(5, Math.ceil(ch / 4));
  const pool = MONSTERS.filter((m) => m.tier === tier || m.tier === Math.max(1, tier - 1));
  const out = [];
  if (stg === STAGES_PER_CH) {
    out.push(monsterUnit(BOSSES[ch - 1], lv + 2, { boss: true }));
    const n = ch >= 5 ? 2 : 1;
    for (let i = 0; i < n; i++) out.push(monsterUnit(pool[(rng() * pool.length) | 0], lv));
  } else {
    const n = 2 + ((rng() * 3) | 0);
    const kinds = [pool[(rng() * pool.length) | 0], pool[(rng() * pool.length) | 0]];
    for (let i = 0; i < n; i++) out.push(monsterUnit(kinds[(rng() * kinds.length) | 0], lv));
  }
  return out;
}

/* ══════════ サウンド（王道RPG風シンセ） ══════════ */
const RSND = (() => {
  let ctx = null, master = null, muted = false;
  try { muted = JSON.parse(localStorage.getItem("magires_mute") || "false"); } catch (e) {}
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.35; master.connect(ctx.destination); } catch (e) {} }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(f, type, dur, vol, slide, delay) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t0 + dur);
    g.gain.setValueAtTime(vol || 0.12, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur);
  }
  function noise(dur, vol) {
    const c = ac(); if (!c) return;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain(); g.gain.value = vol || 0.1;
    src.connect(g); g.connect(master); src.start();
  }
  return {
    tap: () => tone(880, "square", 0.05, 0.06),
    blip: () => tone(1320, "square", 0.025, 0.03),
    ok: () => { tone(660, "square", 0.07, 0.08); tone(990, "square", 0.1, 0.08, 0, 0.07); },
    err: () => tone(150, "square", 0.18, 0.08),
    slash: () => { noise(0.12, 0.1); tone(300, "sawtooth", 0.1, 0.06, -180); },
    hitE: () => { tone(200, "square", 0.08, 0.1, -80); },
    hitA: () => { noise(0.18, 0.12); tone(110, "sawtooth", 0.22, 0.12, -60); },
    crit: () => { noise(0.25, 0.16); tone(90, "sawtooth", 0.3, 0.15, -40); },
    spell: () => { tone(520, "triangle", 0.09, 0.1); tone(780, "triangle", 0.09, 0.1, 0, 0.09); tone(1040, "triangle", 0.14, 0.1, 0, 0.18); },
    heal: () => { tone(780, "sine", 0.1, 0.1); tone(1170, "sine", 0.16, 0.1, 0, 0.1); },
    mdead: () => tone(160, "sawtooth", 0.35, 0.1, -120),
    flee: () => { tone(500, "square", 0.06, 0.08); tone(400, "square", 0.06, 0.08, 0, 0.07); tone(300, "square", 0.09, 0.08, 0, 0.14); },
    fanfare: () => { [[523, 0], [523, 0.12], [523, 0.24], [659, 0.36], [784, 0.55], [659, 0.7], [784, 0.82]].forEach(([f, d]) => tone(f, "square", 0.16, 0.1, 0, d)); },
    levelup: () => { [[392, 0], [523, 0.1], [659, 0.2], [784, 0.3], [1047, 0.42]].forEach(([f, d]) => tone(f, "square", 0.18, 0.1, 0, d)); },
    chime: () => { [880, 1174, 1568].forEach((f, i) => tone(f, "sine", 0.4, 0.07, 0, i * 0.09)); },
    win: () => RSND.fanfare(),
    toggle() { muted = !muted; localStorage.setItem("magires_mute", JSON.stringify(muted)); if (master) master.gain.value = muted ? 0 : 0.35; return muted; },
    muted: () => muted,
  };
})();
window.RSND = RSND;

/* ══════════ トースト ══════════ */
function toast(html, warn) {
  const box = $("#toasts");
  const t = document.createElement("div");
  t.className = "rtoast" + (warn ? " warn" : "");
  t.innerHTML = html;
  box.appendChild(t);
  setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 400); }, 2800);
}

/* ══════════ オープニングムービー ══════════ */
function playMovie(done) {
  const mv = $("#movie");
  mv.classList.remove("hidden");
  startStarfield();
  const scenes = [
    { d: 4200, html: `<div class="mv-txt">むかしむかし——<br><br>せかいには まりょくの ながれ<br><b>マナ・ストリーム</b>が めぐっていた。</div>` },
    { d: 3200, html: `<div class="corp-cap">PRESENTED BY</div><div class="corp"><img src="../../brand/NGX.png" alt="NGX"></div>`, snd: "chime" },
    { d: 4400, html: `<div class="mv-txt">——あるひ。そらに「やみ」が にじんだ。<br><br>ほろびた せかいから きたる<br><b class="void">まおう ヴォイド</b>。</div>`, snd: "err", shake: true },
    { d: 3200, html: `<div class="corp-cap">IN ASSOCIATION WITH</div><div class="corp"><img src="../../brand/MagicalFuture.png" alt="Magical Future"></div>`, snd: "chime" },
    { d: 4400, html: `<div class="mv-txt">20の ちほうから<br><b>ひかりのオーブ</b>が うばわれ、<br>せかいは しずかに おわりへ かたむいていく。</div>` },
    { d: 4200, html: `<div class="mv-txt glow">「おお ゆうしゃよ——<br><br>　そなたの めざめを まっておったぞ」</div>`, snd: "chime" },
    { d: 3200, html: `<div class="corp-cap">A PRODUCTION OF</div><div class="corp"><img src="../../brand/ISHIDA Production.png" alt="ISHIDA Production"></div>`, snd: "chime" },
    { d: 4400, html: `<div class="mv-txt">なかまと ちからをあわせ<br>オーブを とりもどす たびへ。<br><br>——いま ぼうけんの しょが ひらかれる。</div>` },
    { d: 4200, html: `<div class="mv-logo"><img src="../../thumbs/MagiResonance.jpg" alt="MagiResonance"><div class="mv-sub">— MAGI RESONANCE —<br>コマンドバトルRPG</div></div>`, snd: "fanfare" },
  ];
  let idx = -1, timer = null, alive = true;
  function next() {
    if (!alive) return;
    idx++;
    if (idx >= scenes.length) return finishMv();
    const sc = scenes[idx];
    mv.querySelectorAll(".scene").forEach((s) => s.classList.remove("in"));
    const el = document.createElement("div");
    el.className = "scene"; el.innerHTML = sc.html;
    mv.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
    if (sc.snd && RSND[sc.snd]) RSND[sc.snd]();
    if (sc.shake) { mv.classList.add("shake"); setTimeout(() => mv.classList.remove("shake"), 400); }
    setTimeout(() => { if (el.parentNode && idx < scenes.length) setTimeout(() => el.remove(), 1100); }, sc.d);
    timer = setTimeout(next, sc.d);
  }
  function finishMv() {
    alive = false; clearTimeout(timer);
    stopStarfield();
    mv.classList.add("hidden");
    mv.querySelectorAll(".scene").forEach((s) => s.remove());
    done();
  }
  mv.onclick = () => { RSND.tap(); clearTimeout(timer); next(); };
  $("#mvSkip").onclick = (e) => { e.stopPropagation(); finishMv(); };
  next();
}
let starRaf = 0;
function startStarfield() {
  const c = $("#mvStars"), x = c.getContext("2d");
  c.width = innerWidth; c.height = innerHeight;
  const stars = Array.from({ length: 120 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, z: Math.random() * 1 + 0.2 }));
  (function draw() {
    starRaf = requestAnimationFrame(draw);
    x.fillStyle = "rgba(4,5,14,.4)"; x.fillRect(0, 0, c.width, c.height);
    for (const s of stars) {
      s.y += s.z * 0.5; if (s.y > c.height) { s.y = 0; s.x = Math.random() * c.width; }
      x.fillStyle = `rgba(200,210,255,${s.z * 0.7})`;
      x.fillRect(s.x, s.y, s.z * 1.6, s.z * 1.6);
    }
  })();
}
function stopStarfield() { cancelAnimationFrame(starRaf); }

/* ══════════ タイトル ══════════ */
function showTitle() {
  $("#title").classList.remove("hidden");
  $("#title").onclick = () => {
    RSND.fanfare();
    $("#title").classList.add("hidden");
    S.introSeen = true; save();
    enterGame();
  };
}

/* ══════════ 画面遷移 ══════════ */
const VIEWS = ["home", "story", "party", "explore", "challenge", "arena", "dex", "missions", "shop"];
let curView = "home";
function switchView(v) {
  curView = v;
  if (v !== "home" && window.World) World.stop();
  VIEWS.forEach((k) => { const el = $("#view-" + k); if (el) el.classList.toggle("off", k !== v); });
  const bt = $("#backTown"); if (bt) bt.classList.toggle("show", v !== "home");
  const render = { home: renderHome, story: renderStory, party: renderParty, explore: renderExplore, challenge: renderChallenge, arena: renderArena, dex: renderDex, missions: renderMissions, shop: renderShop }[v];
  if (render) render();
  RSND.tap();
}
function refreshTop() {
  $("#topXeva").textContent = xevaBal().toLocaleString();
  $("#topGold").textContent = (S.gold || 0).toLocaleString();
}
function enterGame() {
  $("#app").classList.remove("hidden");
  rollDaily();
  refreshTop();
  switchView("home");
  trackMission("login");
  setInterval(refreshTop, 20000);
}

/* ══════════ HOME — 2Dワールド ══════════ */
function renderHome() {
  const owned = ownedIds();
  const prog = storyProgress();
  const title = S.curTitle || "かけだしゆうしゃ";
  const ids = validParty();
  const lvAvg = ids.length ? Math.round(ids.reduce((a, id) => a + lvOf(id), 0) / ids.length) : 1;
  $("#view-home").innerHTML = `
    <div class="world-hud dqwin">
      <img src="${myCharFile() ? CHARS_IMG + myCharFile() : "../../thumbs/MagiResonance.jpg"}" alt="">
      <div class="wh-info">
        <div><b>${esc(myName())}</b> <span class="wh-title">👑 ${esc(title)}</span></div>
        <small>📖 ${prog.ch > 20 ? "だいまおう とうばつずみ！" : CHAPTERS[prog.ch - 1].nm + " " + prog.stg}　🔮 オーブ ${S.orbs || 0}/20　Lv${lvAvg}　💰 ${S.gold.toLocaleString()}G</small>
      </div>
    </div>
    <div class="world-box">
      <canvas id="worldCanvas"></canvas>
      <div class="dpad" id="dpad">
        <button data-d="up">▲</button>
        <button data-d="left">◀</button>
        <button data-d="right">▶</button>
        <button data-d="down">▼</button>
      </div>
      <button class="abtn" id="aBtn">A</button>
    </div>
    <div class="world-hint">じゅうじキー（やじるしキー/WASD）で いどう ─ たてものに はいると メニュー ／ <b>A</b>＝はなす・しらべる</div>`;
  const partySet = new Set(S.party || []);
  let list = Object.keys(owned).filter((id) => !partySet.has(id) && charById(id));
  if (list.length < 3) list = list.concat((S.party || []).filter((id) => owned[id]));
  const echoes = list.slice(0, 3).map((id) => { const ch = charById(id); return ch ? { img: imgOf(ch), nm: ch.name } : null; }).filter(Boolean);
  World.start($("#worldCanvas"), {
    state: { pos: S.worldPos || null, playerImg: myCharFile() ? CHARS_IMG + myCharFile() : null, echoes },
    openView: (v, tab) => {
      if (v === "inn") { innDialog(); return; }
      if (v === "shop") { shopTab = tab || "w"; }
      switchView(v);
    },
    openHref: (h) => { location.href = h; },
    dialog: (t, lines) => storyDialog(t, lines),
    prop: handleWorldProp,
    save: (pos) => { S.worldPos = pos; save(); },
  });
  $$("#dpad button").forEach((b) => {
    const set = (on) => (e) => { e.preventDefault(); World.setPad(on ? b.dataset.d : null); };
    b.addEventListener("pointerdown", set(true));
    b.addEventListener("pointerup", set(false));
    b.addEventListener("pointerleave", set(false));
    b.addEventListener("pointercancel", set(false));
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  $("#aBtn").onclick = () => World.interact();
}
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function storyProgress() {
  for (let c = 1; c <= 20; c++) for (let g = 1; g <= STAGES_PER_CH; g++) {
    if (!S.story[c + "-" + g]) return { ch: c, stg: g };
  }
  return { ch: 21, stg: 1 };
}
function handleWorldProp(pr) {
  if (pr.kind === "board") { switchView("missions"); return; }
  if (pr.kind === "fountain") {
    const key = "fnt_" + today();
    if (!S.xevaKeys[key]) {
      S.xevaKeys[key] = 1; S.gold += 30; save(); refreshTop();
      RSND.chime();
      storyDialog("⛲ いのちのいずみ", ["いずみが あわく ひかり——\n\n💰 30ゴールドを みつけた！（1にち1かい）"]);
    } else {
      storyDialog("⛲ いのちのいずみ", ["すんだ みなもに あなたと なかまが うつっている。\nきょうは もう いいことが おきたようだ。"]);
    }
    return;
  }
  if (pr.kind === "orb") {
    storyDialog("🔮 オーブのだい", [
      `だいざには 20の くぼみが ある。\n\nひかりのオーブ: ${S.orbs || 0} / 20`,
      (S.orbs || 0) >= 20 ? "すべての オーブが ひかりかがやいている！\nせかいは すくわれたのだ！" : "うばわれた オーブは かくちの ボスが まもっている。\nおうさまの めいを はたすのだ！",
    ]);
  }
}

/* ── 宿屋 ── */
function innDialog() {
  const ids = validParty();
  if (!ids.length) { storyDialog("🛏️ やどや", ["「おや なかまが いないようだね。\n　さかばで なかまを つれてきなよ」"]); return; }
  const cost = ids.length * 15;
  const needs = ids.some((id) => { const ch = charById(id), st = statsOf(ch); return curHp(id) < st.mhp || curMp(id) < st.mmp; });
  if (!needs) { storyDialog("🛏️ やどや", ["「みんな げんきそうだね！\n　また つかれたら おいでよ」"]); return; }
  if (S.gold < cost) { storyDialog("🛏️ やどや", [`「ひとばん ${cost}ゴールドだよ。\n　……おや おかねが たりないようだね」`]); RSND.err(); return; }
  if (!confirm(`🛏️ ひとばん ${cost}ゴールドです。とまりますか？`)) return;
  S.gold -= cost;
  healAll(true);
  refreshTop();
  RSND.heal();
  storyDialog("🛏️ やどや", ["ゆっくり やすんで つかれが とれた！\nHPと MPが ぜんかいふくした！", "「いってらっしゃい！ ぶじを いのってるよ」"]);
}

/* ══════════ ストーリー ══════════ */
let stCh = 1;
function renderStory() {
  const prog = storyProgress();
  if (stCh > 20) stCh = 20;
  const C = CHAPTERS[stCh - 1];
  const chBtns = CHAPTERS.map((c, i) => {
    const n = i + 1;
    const open = chapterOpen(n);
    const done = !!S.story[n + "-" + STAGES_PER_CH];
    return `<button class="chbtn${stCh === n ? " on" : ""}${open ? "" : " lk"}" ${open ? `onclick="setStCh(${n})"` : ""}>${done ? "🔮" : open ? "▶" : "🔒"}${n}</button>`;
  }).join("");
  let stages = "";
  for (let g = 1; g <= STAGES_PER_CH; g++) {
    const key = stCh + "-" + g;
    const cleared = !!S.story[key];
    const open = stageOpen(stCh, g);
    const boss = g === STAGES_PER_CH;
    const nm = boss ? "👹 ボス: " + BOSSES[stCh - 1].nm : STAGE_WORDS[hashN(key, 5) % STAGE_WORDS.length];
    stages += `<div class="stg${cleared ? " done" : ""}${open ? "" : " lk"}${boss ? " boss" : ""}" ${open ? `onclick="startStage(${stCh},${g})"` : ""}>
      <div class="stg-n">${stCh}-${g}</div>
      <div class="stg-nm">${nm}${cleared ? " ✔" : ""}</div>
      <div class="stg-r">てきLv${stageLv(stCh, g)}${boss ? " ／ 🔮オーブ" : ""}</div>
    </div>`;
  }
  $("#view-story").innerHTML = `
    <div class="dqwin pad">
      <div class="dq-h">📖 ぼうけんのしょ <span class="hint">オーブ ${S.orbs || 0}/20</span></div>
      <div class="ch-scroll">${chBtns}</div>
      <div class="ch-head">
        <div class="ch-t">${C.nm}</div>
        <div class="ch-a">${C.area}</div>
      </div>
      <div class="stg-grid">${stages}</div>
      <p class="note">パーティは4にんまで（さかばで へんせい）。しょうの さいごには ボスが まちうける。HPMPは もちこし——やどやで やすんでから いこう！</p>
    </div>`;
}
window.setStCh = (n) => { stCh = n; renderStory(); };
function chapterOpen(ch) {
  if (ch === 1) return true;
  return !!S.story[(ch - 1) + "-" + STAGES_PER_CH];
}
function stageOpen(ch, g) {
  if (!chapterOpen(ch)) return false;
  if (g === 1) return true;
  return !!S.story[ch + "-" + (g - 1)];
}

window.startStage = async (ch, g) => {
  const ids = validParty();
  if (!ids.length) { toast("🍺 さかばで なかまを へんせいしよう", true); switchView("party"); return; }
  if (!partyUnits().length) { toast("みんな ちからつきている……やどやで やすもう", true); return; }
  if (g === 1 && !S.storyRead["c" + ch]) {
    await storyDialog(CHAPTERS[ch - 1].nm, CHAPTERS[ch - 1].intro);
    S.storyRead["c" + ch] = 1; save();
  }
  const boss = g === STAGES_PER_CH;
  const foes = stageEnemies(ch, g);
  DQB.start({
    title: `${CHAPTERS[ch - 1].area} ${ch}-${g}`,
    party: partyUnits(), enemies: foes,
    items: S.items, canFlee: true,
    onEnd: (res) => afterBattle(res, {
      kind: "story", ch, g, boss, enemKeys: foes.map((f) => f.key),
      onWin: async () => {
        const key = ch + "-" + g;
        const first = !S.story[key];
        S.story[key] = 1;
        if (boss && first) { S.orbs = (S.orbs || 0) + 1; }
        save();
        if (first) awardXeva("st_" + key, boss ? 50 : 10, `${ch}-${g} はつクリア`);
        if (boss) {
          await storyDialog("🔮 ひかりのオーブ", [`${BOSSES[ch - 1].nm}を うちたおした！`, `『ひかりのオーブ』を とりもどした！（${S.orbs}/20）`]);
          if (!S.storyRead["o" + ch]) {
            await storyDialog(CHAPTERS[ch - 1].nm + " — クリア", CHAPTERS[ch - 1].outro);
            S.storyRead["o" + ch] = 1; save();
          }
        }
        checkAchievements();
        renderStory();
      },
    }),
  });
};

/* ── バトル後の共通処理（経験値・レベルアップ・全滅） ── */
async function afterBattle(res, opt) {
  opt = opt || {};
  // HP/MP持ち越し
  (res.party || []).forEach((p) => setHpMp(p.id, p.hp, p.mp));
  save(); refreshTop();
  // 図鑑
  if (opt.enemKeys) opt.enemKeys.forEach((k) => { if (k) S.mdex[k] = (S.mdex[k] || 0) + 1; });
  if (res.win) {
    trackMission("win");
    S.gold += res.gold || 0;
    // 経験値: 生存メンバーに全額
    const lvMsgs = [];
    (res.party || []).forEach((p) => {
      if (!p.alive) return;
      const before = lvOf(p.id);
      S.xp[p.id] = (S.xp[p.id] || 0) + (res.exp || 0);
      const after = lvOf(p.id);
      if (after > before) {
        const ch = charById(p.id);
        const st0 = statsOf(ch, before), st1 = statsOf(ch, after);
        // レベルアップぶん回復
        S.hp[p.id] = Math.min(st1.mhp, (S.hp[p.id] || 0) + (st1.mhp - st0.mhp));
        S.mp[p.id] = Math.min(st1.mmp, (S.mp[p.id] || 0) + (st1.mmp - st0.mmp));
        lvMsgs.push(`${ch.name}は レベル${after}に あがった！`);
        // 新しく覚えたもの
        (LEARN[jobOf(ch)] || []).forEach((e) => {
          if (e.lv > before && e.lv <= after) {
            const nm = e.s ? SPELLS[e.s].nm : ARTS[e.a].nm;
            lvMsgs.push(`　${e.s ? "じゅもん" : "とくぎ"}『${nm}』を おぼえた！`);
          }
        });
      }
    });
    save(); refreshTop();
    if (lvMsgs.length) { RSND.levelup(); await storyDialog("🎺 レベルアップ！", lvMsgs); }
    checkAchievements();
    if (opt.onWin) await opt.onWin();
  } else if (res.fled) {
    toast("🏃 うまく にげきった");
    if (opt.onFled) opt.onFled(); else switchView(curView);
  } else {
    // ぜんめつ
    const lost = Math.floor(S.gold / 2);
    S.gold -= lost;
    healAll(true);
    save(); refreshTop();
    await storyDialog("🏰 アステルナ城", [
      "……きがつくと おしろに はこばれていた。",
      `「おお ゆうしゃよ！ ぜんめつしてしまうとは なさけない！」`,
      `しょじきんの はんぶん（${lost.toLocaleString()}G）を おとしてしまった……。`,
      "「だが あきらめるでないぞ。そなたたちの きずは いやしておいた」",
    ]);
    switchView("home");
  }
}

/* ── ストーリーダイアログ（DQ窓） ── */
function storyDialog(title, lines) {
  return new Promise((res) => {
    const ov = $("#storyOv");
    ov.classList.add("on");
    $("#soTitle").textContent = title;
    let i = 0;
    function show() {
      if (i >= lines.length) { ov.classList.remove("on"); res(); return; }
      typeText($("#soText"), lines[i]);
      i++;
    }
    $("#soNext").onclick = show;
    $("#soSkip").onclick = () => { ov.classList.remove("on"); res(); };
    show();
  });
}
let typeIv = null;
function typeText(el, text) {
  clearInterval(typeIv);
  el.innerHTML = ""; let i = 0;
  typeIv = setInterval(() => {
    el.innerHTML = text.slice(0, ++i).replace(/\n/g, "<br>");
    if (i % 3 === 0) RSND.blip();
    if (i >= text.length) clearInterval(typeIv);
  }, 26);
}

/* ══════════ なかまの酒場（編成） ══════════ */
function renderParty() {
  const owned = ownedIds();
  S.party = (S.party || []).filter((id) => owned[id]);
  const list = Object.keys(owned).map(charById).filter(Boolean)
    .sort((a, b) => lvOf(b.id) - lvOf(a.id));
  const slots = Array.from({ length: 4 }, (_, i) => {
    const id = S.party[i];
    const ch = id && charById(id);
    if (!ch) return `<div class="pslot empty"><div class="pl">＋</div></div>`;
    const st = statsOf(ch);
    return `<div class="pslot" onclick="unslot('${id}')">
      <img src="${imgOf(ch)}"><div class="pn">${ch.name}</div>
      <div class="ps">${JOBS[jobOf(ch)].ic}Lv${st.lv} HP${curHp(id)}/${st.mhp}</div></div>`;
  }).join("");
  $("#view-party").innerHTML = `
    <div class="dqwin pad">
      <div class="dq-h">🍺 なかまのさかば <span class="hint">パーティ ${S.party.length}/4</span></div>
      <div class="pslots">${slots}</div>
      <p class="note">「よう ゆうしゃさん！ つれていく なかまを えらびな」\nタップで はずす。したの なかまを タップで くわえる。ⓘで つよさを みる。</p>
    </div>
    <div class="dqwin pad">
      <div class="dq-h">なかまたち <span class="hint">${list.length}にん</span></div>
      <div class="cgrid">${list.map((ch) => {
        const st = statsOf(ch), inP = S.party.includes(ch.id);
        const J = JOBS[jobOf(ch)];
        const dead = curHp(ch.id) <= 0;
        return `<div class="cc${inP ? " sel" : ""}${dead ? " ko" : ""}" onclick="slotChar('${ch.id}')">
          <span class="clv">Lv${st.lv}</span><span class="cjob">${J.ic}</span>
          <img src="${imgOf(ch)}">
          <span class="cinfo" onclick="event.stopPropagation();openChar('${ch.id}')">ⓘ</span>
          <div class="cn">${ch.name}</div>
          <div class="cp">${J.nm}${dead ? "／しにそう" : ""}</div>
        </div>`;
      }).join("") || '<p class="note">なかまが いない！ <a href="../gacha.html" style="color:var(--gold)">XEVAガチャ</a>で なかまを むかえよう。</p>'}</div>
    </div>`;
}
window.slotChar = (id) => {
  if (S.party.includes(id)) return;
  if (S.party.length >= 4) { toast("パーティは 4にんまで じゃ", true); return; }
  S.party.push(id); save(); renderParty(); RSND.ok();
};
window.unslot = (id) => { S.party = S.party.filter((x) => x !== id); save(); renderParty(); RSND.tap(); };

/* ── つよさ（キャラ詳細） ── */
window.openChar = (id) => {
  const ch = charById(id); if (!ch) return;
  const st = statsOf(ch);
  const J = JOBS[jobOf(ch)];
  const lv = st.lv, xp = S.xp[id] || 0;
  const need = lv >= MAX_LV ? 0 : xpForLv(lv + 1) - xp;
  const eq = eqOf(id);
  const w = weaponById(eq.w), a = armorById(eq.a), sh = shieldById(eq.s);
  const learn = LEARN[jobOf(ch)] || [];
  const rows = learn.map((e) => {
    const got = e.lv <= lv;
    const def = e.s ? SPELLS[e.s] : ARTS[e.a];
    return `<div class="sk-row${got ? "" : " lk"}">
      <span class="ic">${got ? (def.fx || "✨") : "🔒"}</span>
      <div><b>${got ? def.nm : "？？？"}</b><small>${e.s ? "じゅもん" : "とくぎ"}${def.mp ? `・MP${def.mp}` : ""}・Lv${e.lv}</small>
      <div class="skd">${got ? def.d : "レベル" + e.lv + "で おぼえる"}</div></div></div>`;
  }).join("") || "<p class='note'>この しょくぎょうは じゅもんを つかわない。\nそのぶん うでっぷしが つよい！</p>";
  $("#charOv").classList.add("on");
  $("#charCard").innerHTML = `
    <div class="cd-hero"><img src="${imgOf(ch)}"><div class="cd-grad"></div>
      <button class="cd-x" onclick="closeOv('charOv')">✕</button>
      <div class="cd-chips"><span class="chip">${J.ic} ${J.nm}</span><span class="chip gold">${ch.rarity}</span></div>
    </div>
    <div class="cd-body">
      <div class="cd-nm">${ch.name}</div>
      <div class="dqwin pad tsuyosa">
        <div class="dq-h">つよさ</div>
        <div class="ts-grid">
          <div><span>レベル</span><b>${lv}</b></div>
          <div><span>HP</span><b>${curHp(id)}/${st.mhp}</b></div>
          <div><span>MP</span><b>${curMp(id)}/${st.mmp}</b></div>
          <div><span>ちから</span><b>${st.atk}</b></div>
          <div><span>みのまもり</span><b>${st.def}</b></div>
          <div><span>すばやさ</span><b>${st.agi}</b></div>
          <div><span>かしこさ</span><b>${st.wis}</b></div>
          <div><span>こうげき力</span><b>${atkPower(ch, st)}</b></div>
          <div><span>しゅび力</span><b>${defPower(ch, st)}</b></div>
        </div>
        <p class="note">${lv >= MAX_LV ? "レベルは さいだいだ！" : `つぎのレベルまで あと ${need.toLocaleString()}ポイント`}　${J.d}</p>
      </div>
      <div class="dqwin pad">
        <div class="dq-h">そうび</div>
        <div class="eq-line">🗡 ぶき：<b>${w ? w.nm : "なし"}</b>${w ? `<small>こうげき+${w.atk}</small>` : ""}</div>
        <div class="eq-line">🥋 よろい：<b>${a ? a.nm : "なし"}</b>${a ? `<small>しゅび+${a.def}</small>` : ""}</div>
        <div class="eq-line">🛡 たて：<b>${sh ? sh.nm : "なし"}</b>${sh ? `<small>しゅび+${sh.def}</small>` : ""}</div>
        <p class="note">そうびは まちの「ぶきとぼうぐのみせ」で かえる。</p>
      </div>
      <div class="dqwin pad">
        <div class="dq-h">じゅもん・とくぎ</div>
        ${rows}
      </div>
    </div>`;
};
window.closeOv = (id) => $("#" + id).classList.remove("on");

/* ══════════ おみせ ══════════ */
let shopTab = "w";
function renderShop() {
  const tabs = [
    { k: "w", nm: "🗡 ぶき" }, { k: "a", nm: "🥋 よろい" }, { k: "s", nm: "🛡 たて" }, { k: "i", nm: "🎒 どうぐ" },
  ];
  const list = shopTab === "w" ? WEAPONS : shopTab === "a" ? ARMORS : shopTab === "s" ? SHIELDS : null;
  let rows;
  if (list) {
    rows = list.map((it) => `
      <div class="shop-row" onclick="buyGear('${shopTab}','${it.id}')">
        <b>${it.nm}</b><small>${shopTab === "w" ? "こうげき+" + it.atk : "しゅび+" + it.def}</small>
        <span class="price">${it.price.toLocaleString()}G</span>
      </div>`).join("");
  } else {
    rows = Object.keys(ITEMS).map((k) => `
      <div class="shop-row" onclick="buyItem('${k}')">
        <b>${ITEMS[k].ic} ${ITEMS[k].nm}</b><small>${ITEMS[k].d}／しょじ×${S.items[k] || 0}</small>
        <span class="price">${ITEMS[k].price.toLocaleString()}G</span>
      </div>`).join("");
  }
  $("#view-shop").innerHTML = `
    <div class="dqwin pad">
      <div class="dq-h">${shopTab === "i" ? "🎒 どうぐや" : "⚔ ぶきとぼうぐのみせ"} <span class="hint">しょじきん ${S.gold.toLocaleString()}G</span></div>
      <p class="note">「いらっしゃい！ なにを おもとめだい？」</p>
      <div class="seg">${tabs.map((t) => `<button class="${shopTab === t.k ? "on" : ""}" onclick="setShopTab('${t.k}')">${t.nm}</button>`).join("")}</div>
      <div class="shop-list">${rows}</div>
    </div>`;
}
window.setShopTab = (k) => { shopTab = k; renderShop(); RSND.tap(); };
window.buyItem = (k) => {
  const it = ITEMS[k];
  if (S.gold < it.price) { toast("「おかねが たりないようだね」", true); RSND.err(); return; }
  if (!confirm(`${it.nm}を ${it.price}ゴールドで かいますか？`)) return;
  S.gold -= it.price;
  S.items[k] = (S.items[k] || 0) + 1;
  save(); refreshTop(); renderShop();
  RSND.ok(); toast(`🎒 ${it.nm}を てにいれた！`);
  trackMission("buy");
};
window.buyGear = (slot, itemId) => {
  const list = slot === "w" ? WEAPONS : slot === "a" ? ARMORS : SHIELDS;
  const it = list.find((x) => x.id === itemId); if (!it) return;
  if (S.gold < it.price) { toast("「おかねが たりないようだね」", true); RSND.err(); return; }
  const ids = validParty().length ? validParty() : Object.keys(ownedIds()).slice(0, 4);
  if (!ids.length) { toast("そうびする なかまが いない！", true); return; }
  // だれがそうびする？
  pickSheet(`${it.nm}（${it.price}G）— だれが そうびする？`, ids.map((id) => {
    const ch = charById(id);
    const cur = eqOf(id)[slot];
    const curIt = slot === "w" ? weaponById(cur) : slot === "a" ? armorById(cur) : shieldById(cur);
    return {
      html: `<img class="mini" src="${imgOf(ch)}"> <b>${ch.name}</b><small>いま: ${curIt ? curIt.nm : "なし"}</small>`,
      fn: () => {
        if (S.gold < it.price) return;
        S.gold -= it.price;
        S.eq[id] = S.eq[id] || {};
        S.eq[id][slot] = it.id;
        save(); refreshTop(); renderShop();
        RSND.ok(); toast(`${ch.name}は ${it.nm}を そうびした！`);
        trackMission("buy");
      },
    };
  }));
};
function pickSheet(title, items, note) {
  const ov = $("#pickOv");
  ov.classList.add("on");
  $("#pickCard").innerHTML = `<div class="dq-h">${title}</div>
    <div class="pick-list">${items.map((it, i) => `<div class="pick-item" data-i="${i}">${it.html}</div>`).join("")}</div>
    ${note ? `<p class="note">${note}</p>` : ""}
    <button class="sec wide" onclick="closeOv('pickOv')">やめる</button>`;
  $$("#pickCard .pick-item").forEach((el) => {
    el.onclick = () => { closeOv("pickOv"); items[+el.dataset.i].fn(); };
  });
}

/* ══════════ たんけん（みなみのもり） ══════════ */
let EX = null;
function renderExplore() {
  if (EX) return renderExploreRun();
  $("#view-explore").innerHTML = `
    <div class="dqwin pad">
      <div class="dq-h">🌲 みなみのもり たんけん</div>
      <p class="note">もりの おくへ すすみ たからばこや まものと であう。\nHPMPは もちこし——じゅんびを してから いこう。たんけんりつ100%で ボーナス！</p>
      <div class="exp-stats">
        <div><span>るいけいたんけん</span><b>${S.expDone || 0}かい</b></div>
        <div><span>しょじきん</span><b>${S.gold.toLocaleString()}G</b></div>
      </div>
      <button class="pri wide" onclick="startExplore()">🌲 たんけんに でる</button>
    </div>`;
}
window.startExplore = () => {
  const ids = validParty();
  if (!ids.length) { toast("🍺 さかばで なかまを へんせいしよう", true); switchView("party"); return; }
  if (!partyUnits().length) { toast("みんな ちからつきている……やどやで やすもう", true); return; }
  const rng = seededRng("ex" + Date.now());
  const kinds = ["treasure", "battle", "battle", "rest", "event", "treasure", "battle", "hidden"];
  const nodes = [];
  for (let i = 0; i < 10; i++) {
    let k = kinds[(rng() * kinds.length) | 0];
    if (i === 9) k = "strong";
    nodes.push({ k, done: false });
  }
  EX = { nodes, pos: 0, found: 0, loot: [] };
  renderExploreRun();
};
const EX_ICONS = { treasure: "📦", battle: "⚔", rest: "🏕", event: "❓", strong: "👹", hidden: "🚪" };
function renderExploreRun() {
  const rate = Math.round(EX.found / EX.nodes.length * 100);
  $("#view-explore").innerHTML = `
    <div class="dqwin pad">
      <div class="dq-h">🌲 たんけんちゅう… <span class="hint">たんけんりつ ${rate}%</span></div>
      <div class="exp-map">${EX.nodes.map((n, i) => `<div class="exnode${i === EX.pos ? " here" : ""}${n.done ? " done" : ""}${i > EX.pos ? " fog" : ""}">${i > EX.pos ? "❔" : EX_ICONS[n.k]}</div>`).join('<span class="expath"></span>')}</div>
      <div class="exp-log">${EX.lastMsg || "もりの いりぐちに たった。……いこう。"}</div>
      <div class="exp-loot">${EX.loot.map((l) => `<span>${l}</span>`).join("") || "<span>まだ なにも みつけていない</span>"}</div>
      <button class="pri wide" id="exNext">${EX.pos >= EX.nodes.length ? "たんけん かんりょう！" : "▶ すすむ"}</button>
      <button class="sec wide" onclick="endExplore(false)">ひきかえす</button>
    </div>`;
  $("#exNext").onclick = exploreStep;
}
function exploreStep() {
  if (EX.pos >= EX.nodes.length) return endExplore(true);
  const node = EX.nodes[EX.pos];
  node.done = true; EX.found++;
  const lvAvg = Math.max(1, Math.round(validParty().reduce((a, id) => a + lvOf(id), 0) / validParty().length));
  const gainGold = () => { const g = 20 + ((Math.random() * lvAvg * 14) | 0); S.gold += g; EX.loot.push("💰" + g); return g; };
  const gainItem = () => {
    const keys = ["yakusou", "yakusou", "iiyaku", "seisui", "ha"];
    const k = keys[(Math.random() * keys.length) | 0];
    S.items[k] = (S.items[k] || 0) + 1;
    EX.loot.push(ITEMS[k].ic);
    return ITEMS[k].nm;
  };
  let msg = "";
  switch (node.k) {
    case "treasure": {
      if (Math.random() < 0.5) msg = `たからばこを あけた！ ${gainGold()}ゴールドを てにいれた！`;
      else msg = `たからばこを あけた！ ${gainItem()}を てにいれた！`;
      break;
    }
    case "rest": {
      validParty().forEach((id) => {
        const ch = charById(id), st = statsOf(ch);
        if (curHp(id) > 0) {
          S.hp[id] = Math.min(st.mhp, curHp(id) + Math.round(st.mhp * 0.35));
          S.mp[id] = Math.min(st.mmp, curMp(id) + Math.round(st.mmp * 0.25));
        }
      });
      msg = "🏕 いずみの ほとりで ひとやすみ。\nHPと MPが すこし かいふくした！";
      break;
    }
    case "hidden": msg = `🚪 かくしべやを はっけん！ ${Math.random() < 0.5 ? gainGold() + "ゴールド！" : gainItem() + "を てにいれた！"}`; break;
    case "event": msg = ["❓ ふるい せきひに こだいもじ。……よめない。", "❓ くろい ちょうが みちあんないするように とんでいく。", "❓ だれかの にっきの きれはし。『まおうは ないていた』", "❓ " + gainItem() + "が おちていた！"][(Math.random() * 4) | 0]; break;
    case "battle": case "strong": {
      EX.pos++;
      EX.lastMsg = node.k === "strong" ? "👹 つよそうな けはい……！" : "⚔ まものの むれだ！";
      const rng = seededRng("exb" + Date.now());
      const tier = Math.min(5, Math.ceil(lvAvg / 8));
      const pool = MONSTERS.filter((m) => m.tier <= tier);
      const n = node.k === "strong" ? 3 : 2 + ((rng() * 2) | 0);
      const foes = [];
      for (let i = 0; i < n; i++) foes.push(monsterUnit(pool[(rng() * pool.length) | 0], Math.round(lvAvg * (node.k === "strong" ? 1.15 : 0.9)), node.k === "strong" && i === 0 ? { hpMul: 2 } : {}));
      DQB.start({
        title: "みなみのもり",
        party: partyUnits(), enemies: foes, items: S.items, canFlee: true,
        onEnd: (res) => afterBattle(res, {
          enemKeys: foes.map((f) => f.key),
          onWin: () => { EX.lastMsg = "たたかいに かった！ さきへ すすもう。"; renderExploreRun(); },
          onFled: () => { EX.lastMsg = "なんとか にげきった……。"; renderExploreRun(); },
        }),
      });
      save();
      return;
    }
  }
  EX.pos++; EX.lastMsg = msg;
  save(); refreshTop();
  renderExploreRun();
}
window.endExplore = (complete) => {
  const rate = Math.round(EX.found / EX.nodes.length * 100);
  let bonus = "";
  if (rate >= 100) {
    const g = 100 + (S.expDone || 0) * 10;
    S.gold += g;
    S.items.iiyaku = (S.items.iiyaku || 0) + 1;
    bonus = `🎉 たんけんりつ100%！ ${g}ゴールドと いいやくそうを てにいれた！`;
  }
  S.expDone = (S.expDone || 0) + 1;
  save(); refreshTop();
  EX = null;
  trackMission("explore");
  checkAchievements();
  toast(bonus || `🌲 たんけん おわり（たんけんりつ ${rate}%）`);
  renderExplore();
};

/* ══════════ しれんのとう ══════════ */
function renderChallenge() {
  $("#view-challenge").innerHTML = `
    <div class="dqwin pad">
      <div class="dq-h">🗼 しれんのとう <span class="hint">いま ${S.tower || 0}かい</span></div>
      <p class="note">「この とうは のぼるほど つよい まものが でるぞ。\n　5かいごとに XEVAの ほうびが あるという……」\nまけても ペナルティなし（HPMPは へる）。</p>
      <button class="pri wide" onclick="startTower()">🗼 ${(S.tower || 0) + 1}かいに いどむ</button>
    </div>`;
}
window.startTower = () => {
  const ids = validParty();
  if (!ids.length) { toast("🍺 さかばで なかまを へんせいしよう", true); switchView("party"); return; }
  if (!partyUnits().length) { toast("みんな ちからつきている……やどやで やすもう", true); return; }
  const fl = (S.tower || 0) + 1;
  const rng = seededRng("tw" + fl);
  const lv = Math.round(2 + fl * 2.2);
  const tier = Math.min(5, Math.ceil(fl / 7));
  const pool = MONSTERS.filter((m) => m.tier <= tier);
  const foes = [];
  const isBossFl = fl % 5 === 0;
  if (isBossFl) foes.push(monsterUnit(BOSSES[((fl / 5 - 1) % 20) | 0], lv + 2, { boss: true, hpMul: 0.6 }));
  const n = isBossFl ? 1 : 2 + ((rng() * 2) | 0);
  for (let i = 0; i < n; i++) foes.push(monsterUnit(pool[(rng() * pool.length) | 0], lv));
  DQB.start({
    title: `しれんのとう ${fl}かい`,
    party: partyUnits(), enemies: foes, items: S.items, canFlee: true,
    onEnd: (res) => afterBattle(res, {
      enemKeys: foes.map((f) => f.key),
      onWin: () => {
        S.tower = fl; save();
        trackMission("tower");
        if (fl % 5 === 0) awardXeva("tw_" + fl, 30, `しれんのとう${fl}かい`);
        checkAchievements();
        toast(`🗼 ${fl}かいを とっぱ！`);
        renderChallenge();
      },
      onFled: () => renderChallenge(),
    }),
  });
};

/* ══════════ かくとうじょう（アリーナ） ══════════ */
function renderArena() {
  const rk = pvpRankOf(S.arena.rating);
  const attacksLeft = Math.max(0, 5 - (S.arena.atkN || 0));
  $("#view-arena").innerHTML = `
    <div class="dqwin pad arena-head">
      <div class="ar-rank" style="color:${rk.c}">${rk.ic} ${rk.nm}</div>
      <div class="ar-rating">レート <b>${S.arena.rating}</b>（さいこう ${S.arena.best}）</div>
      <div class="ar-wl">${S.arena.wins}しょう ${S.arena.losses}はい ／ きょうの ちょうせん のこり${attacksLeft}かい</div>
      <div class="ar-ladder">${PVP_RANKS.map((r) => `<span class="${S.arena.rating >= r.min ? "got" : ""}" style="--rc:${r.c}">${r.ic}</span>`).join("→")}</div>
    </div>
    <div class="dqwin pad">
      <div class="dq-h">🛡 ぼうえいパーティ</div>
      <p class="note">「おまえさんの パーティを とうろくすれば\n　ほかの ゆうしゃが ちょうせんしてくるぜ」</p>
      <button class="sec wide" onclick="publishDef()">🛡 いまの へんせいを とうろく</button>
    </div>
    <div class="dqwin pad">
      <div class="dq-h">⚔ ランクマッチ <span class="hint">1にち5かい・かちで XEVA</span></div>
      <p class="note">たたかいは コマンドバトル！ そうびも じゅもんも つかえるぞ。\nかくとうじょうの たたかいでは HPMPは へらない（こうえんじあい）。</p>
      <div id="arOpps"><p class="note">あいてを さがしている…</p></div>
    </div>
    <div class="dqwin pad">
      <div class="dq-h">🌐 オンラインたいせん <span class="hint">へやばんごうで つながる</span></div>
      <p class="note">フレンドと へやばんごうを おしえあって しんけんしょうぶ！\nホストの たたかいが りょうほうの がめんに ちゅうけいされる。かち200／まけ60 XEVA。</p>
      <div class="online-btns">
        <button class="pri" onclick="onlineCreate()">🏠 へやを つくる</button>
        <button class="sec" onclick="onlineJoinPrompt()">🚪 へやに はいる</button>
      </div>
      <div id="onlineBox"></div>
    </div>`;
  loadArenaOpponents();
}
/* 相手パーティ→敵ユニット化（かくとうじょう用） */
function rivalUnits(party) {
  return (party || []).map((p) => {
    const ch = charById(p.id); if (!ch) return null;
    const u = allyUnit(p.id, p.lv, p.eq || {});
    if (!u) return null;
    const job = jobOf(ch);
    const ai = job === "mage" ? (u.lv >= 15 ? "filada" : "fila") : job === "priest" ? "naoru" : job === "sage" ? "yowamin" : "atk";
    return {
      nm: ch.name, ic: "🧝", img: imgOf(ch), lv: u.lv,
      mhp: u.mhp, atk: u.atk, def: u.def, agi: u.agi, wis: u.wis, crit: u.crit,
      ai, boss: false, exp: 0, gold: 0,
    };
  }).filter(Boolean);
}
function packParty(ids) { return ids.map((id) => ({ id, lv: lvOf(id), eq: eqOf(id) })); }
function partyPower(ids) {
  return ids.reduce((a, id) => {
    const ch = charById(id); if (!ch) return a;
    const st = statsOf(ch);
    return a + st.mhp / 4 + atkPower(ch, st) * 2 + defPower(ch, st) + st.agi;
  }, 0) | 0;
}
window.publishDef = () => {
  const ids = validParty();
  if (!ids.length) { toast("🍺 さかばで なかまを へんせいしよう", true); return; }
  if (!window.ResOnline) return;
  ResOnline.publishDefense(myUid(), {
    name: myName(), charFile: myCharFile(),
    rating: S.arena.rating, power: partyPower(ids),
    party: packParty(ids),
  });
  RSND.ok(); toast("🛡 ぼうえいパーティを とうろくした！");
};
async function loadArenaOpponents() {
  const el = $("#arOpps"); if (!el) return;
  let opps = [];
  if (window.ResOnline) opps = await ResOnline.fetchDefenses(myUid());
  const rng = seededRng("ghost" + today());
  while (opps.length < 3) {
    const i = opps.length;
    opps.push({ ghost: true, name: ["さすらいのけんし", "ぶとうかガルシア", "まどうしノワル"][i], rating: S.arena.rating - 40 + ((rng() * 120) | 0) });
  }
  opps.sort((a, b) => Math.abs((a.rating || 1000) - S.arena.rating) - Math.abs((b.rating || 1000) - S.arena.rating));
  el.innerHTML = opps.slice(0, 4).map((o) => {
    const rk = pvpRankOf(o.rating || 1000);
    return `<div class="opp-row">
      ${o.charFile ? `<img src="${CHARS_IMG + canonCF(o.charFile, o.charId)}">` : "<span class='rkph'>👤</span>"}
      <div><b>${esc(o.name)}</b><small>${rk.ic} レート${o.rating || 1000}${o.power ? " ／ つよさ" + o.power.toLocaleString() : ""}</small></div>
      <button class="pri" onclick='fightArena(${JSON.stringify(JSON.stringify(o))})'>いどむ</button>
    </div>`;
  }).join("");
}
window.fightArena = (json) => {
  const o = JSON.parse(json);
  if ((S.arena.atkN || 0) >= 5) { toast("⚔ きょうの ちょうせんは おわりじゃ", true); return; }
  const ids = validParty();
  if (!ids.length) { toast("🍺 さかばで なかまを へんせいしよう", true); switchView("party"); return; }
  S.arena.atkN = (S.arena.atkN || 0) + 1;
  let foes = rivalUnits(o.party);
  if (!foes.length) {
    const rng = seededRng("gp" + o.name + today());
    const lvAvg = Math.max(3, Math.round(ids.reduce((a, id) => a + lvOf(id), 0) / ids.length));
    const pool = MONSTERS.filter((m) => m.tier <= Math.min(5, Math.ceil(lvAvg / 8)));
    foes = [];
    for (let i = 0; i < 4; i++) foes.push(monsterUnit(pool[(rng() * pool.length) | 0], lvAvg, { hpMul: 1.3 }));
  }
  // 興行試合: 満タンのコピーで戦う
  const myUnits = validParty().map((id) => allyUnit(id, lvOf(id))).filter(Boolean);
  DQB.start({
    title: "かくとうじょう vs " + o.name,
    party: myUnits, enemies: foes, items: S.items, canFlee: false,
    onEnd: (res) => {
      const oppR = o.rating || 1000;
      const K = 28, expW = 1 / (1 + Math.pow(10, (oppR - S.arena.rating) / 400));
      const delta = Math.round(K * ((res.win ? 1 : 0) - expW));
      S.arena.rating = Math.max(800, S.arena.rating + delta);
      S.arena.best = Math.max(S.arena.best, S.arena.rating);
      if (res.win) { S.arena.wins++; } else { S.arena.losses++; }
      save(); trackMission("arena"); checkAchievements();
      if (res.win && S.arena.atkN <= 5) awardXeva("ar_" + today() + "_" + S.arena.atkN, 15, "かくとうじょう しょうり");
      storyDialog("⚔ かくとうじょう", [
        res.win ? "「みごとな たたかいだった！」" : "「ざんねん！ また きたえて こい！」",
        `レート ${delta >= 0 ? "+" : ""}${delta} → ${S.arena.rating}`,
      ]).then(() => renderArena());
    },
  });
};

/* ── オンライン対戦 ── */
let OL = { room: null, started: false, names: {} };
window.onlineCreate = async () => {
  if (!window.ResOnline) { toast("オンラインきのうを よみこみちゅう…", true); return; }
  const ids = validParty();
  if (!ids.length) { toast("🍺 さかばで なかまを へんせいしよう", true); switchView("party"); return; }
  const r = await ResOnline.create({ uid: myUid(), name: myName(), charFile: myCharFile() });
  if (r.error) { toast("へやを つくれなかった（" + r.error + "）", true); return; }
  await ResOnline.setParty(packParty(ids), partyPower(ids));
  watchRoom();
  toast("🏠 へや " + r.code + " を つくった！");
};
window.onlineJoinPrompt = async () => {
  if (!window.ResOnline) { toast("オンラインきのうを よみこみちゅう…", true); return; }
  const ids = validParty();
  if (!ids.length) { toast("🍺 さかばで なかまを へんせいしよう", true); switchView("party"); return; }
  const code = prompt("へやばんごう（4けた）を いれてください");
  if (!code || !/^\d{4}$/.test(code.trim())) return;
  const r = await ResOnline.join(code.trim(), { uid: myUid(), name: myName(), charFile: myCharFile() });
  if (r.error) {
    toast({ nofound: "へやが みつからない", full: "まんいんだ", started: "もう はじまっている", denied: "つながらなかった" }[r.error] || "はいれなかった", true);
    return;
  }
  await ResOnline.setParty(packParty(ids), partyPower(ids));
  watchRoom();
};
function watchRoom() {
  OL = { room: null, started: false, names: {} };
  ResOnline.watch({
    onRoom: (room) => {
      OL.room = room;
      renderOnlineBox(room);
      if (!room) return;
      const ps = room.players || {};
      for (const uid in ps) OL.names[uid] = ps[uid].name;
      if (room.meta && room.meta.status === "playing" && !OL.started) {
        OL.started = true;
        beginOnlineBattle(room);
      }
      if (room.meta && room.meta.status === "done" && OL.started && !OL.doneShown && !ResOnline.isHost()) {
        OL.doneShown = true;
      }
    },
    onSnap: (snap) => {
      if (!ResOnline.isHost() && DQB.active()) DQB.applySnap(snap);
    },
  });
}
function renderOnlineBox(room) {
  const box = $("#onlineBox"); if (!box) return;
  if (!room) { box.innerHTML = "<p class='note'>へやは かいさんされた。</p>"; return; }
  const ps = room.players || {};
  const uids = Object.keys(ps);
  const ready = uids.length === 2 && uids.every((u) => ps[u].party);
  box.innerHTML = `
    <div class="room-box dqwin pad">
      <div class="room-code">へやばんごう <b>${ResOnline.code()}</b></div>
      ${uids.map((u) => `<div class="room-p">${ps[u].charFile ? `<img src="${CHARS_IMG + canonCF(ps[u].charFile, ps[u].charId)}">` : "👤"} ${esc(ps[u].name)} <small>つよさ${(ps[u].power || 0).toLocaleString()}</small> ${ps[u].online ? "🟢" : "⚪"}</div>`).join("")}
      ${uids.length < 2 ? "<p class='note'>あいての にゅうしつを まっている…\n（このばんごうを あいてに つたえよう）</p>" : ""}
      ${ResOnline.isHost() && ready && room.meta.status === "lobby" ? `<button class="pri wide" onclick="onlineStart()">⚔ しょうぶ かいし！</button>` : ""}
      ${!ResOnline.isHost() && room.meta.status === "lobby" ? "<p class='note'>ホストの かいしを まっている…</p>" : ""}
      <button class="sec wide" onclick="onlineLeave()">たいしゅつ</button>
    </div>`;
}
window.onlineStart = () => { ResOnline.startMatch(); };
window.onlineLeave = async () => { await ResOnline.leave(); const b = $("#onlineBox"); if (b) b.innerHTML = ""; toast("へやを たいしゅつした"); };
function beginOnlineBattle(room) {
  const ps = room.players || {};
  const meUid = myUid();
  const oppUid = Object.keys(ps).find((u) => u !== meUid);
  if (!oppUid) return;
  const myUnits = (ps[meUid].party || []).map((p) => allyUnit(p.id, p.lv, p.eq || {})).filter(Boolean);
  const opUnits = rivalUnits(ps[oppUid].party || []);
  const isHost = ResOnline.isHost();
  if (isHost) {
    DQB.start({
      title: "オンラインたいせん vs " + (ps[oppUid].name || "?"),
      party: myUnits, enemies: opUnits, items: {}, canFlee: false,
      onSnap: (snap) => ResOnline.pushSnap(snap),
      onEnd: async (res) => {
        const winnerUid = res.win ? meUid : oppUid;
        const names = {}; names[meUid] = myName(); names[oppUid] = ps[oppUid].name || "?";
        const out = await ResOnline.reportResult(winnerUid, names);
        storyDialog("🌐 オンラインたいせん", [
          res.win ? "しょうぶに かった！" : "しょうぶに まけた……",
          ...out.map((o) => `${o.name}: +${o.amount} XEVA（ポータルで うけとれる）`),
        ]).then(() => { ResOnline.leave(); renderArena(); });
        trackMission("arena");
      },
    });
  } else {
    // ゲスト: 観戦（ホスト視点を反転表示）
    DQB.start({
      title: "オンラインたいせん vs " + (ps[oppUid].name || "?"),
      party: myUnits, enemies: opUnits, mode: "spectate",
      onEnd: (res) => {
        storyDialog("🌐 オンラインたいせん", [
          res.win ? "しょうぶに かった！" : "しょうぶに まけた……",
          "ほうしゅうXEVAは ポータルの うけとりばこへ（かち200／まけ60）",
        ]).then(() => { ResOnline.leave(); renderArena(); });
        trackMission("arena");
      },
    });
  }
}

/* ══════════ としょかん（ずかん） ══════════ */
let dexTab = "chars";
function renderDex() {
  const owned = ownedIds();
  const chars = allChars();
  let have = 0;
  const charGrid = chars.map((ch) => {
    const own = !!owned[ch.id]; if (own) have++;
    const J = JOBS[jobOf(ch)];
    return `<div class="cc${own ? "" : " no"}" onclick="${own ? `openChar('${ch.id}')` : `toast('🔒 ガチャで なかまに すると みられるぞ',true)`}">
      ${own ? `<span class="clv">Lv${lvOf(ch.id)}</span>` : ""}
      <span class="cjob">${J.ic}</span>
      <img src="${imgOf(ch)}">
      <div class="cn">${own ? ch.name : "？？？"}</div>
      <div class="cp">${own ? J.nm : ""}</div>
    </div>`;
  }).join("");
  const known = Object.keys(S.mdex || {}).length;
  const monGrid = MONSTERS.map((m) => {
    const n = S.mdex[m.key] || 0;
    return `<div class="mon-cell${n ? "" : " no"}">
      <span class="mic">${n ? m.ic : "❔"}</span>
      <div class="cn">${n ? m.nm : "？？？"}</div>
      ${n ? `<small>たおした ×${n}</small>` : ""}
    </div>`;
  }).join("");
  $("#view-dex").innerHTML = `
    <div class="dqwin pad">
      <div class="dq-h">📚 だいとしょかん</div>
      <div class="seg">
        <button class="${dexTab === "chars" ? "on" : ""}" onclick="setDexTab('chars')">🧝 なかま ${have}/${chars.length}</button>
        <button class="${dexTab === "mons" ? "on" : ""}" onclick="setDexTab('mons')">👹 まものずかん ${known}/${MONSTERS.length}</button>
      </div>
      ${dexTab === "chars"
        ? `<div class="cgrid">${charGrid}</div><p class="note">あたらしい なかまは <a href="../gacha.html" style="color:var(--gold)">XEVAガチャ</a>で。</p>`
        : `<div class="mon-grid">${monGrid}</div><p class="note">たおした まものが きろくされる。コンプすると しょうごうが もらえるぞ！</p>`}
    </div>
    <div class="dqwin pad">
      <div class="dq-h">🎒 もちもの <span class="hint">どうぐやで かえる</span></div>
      <div class="inv-grid">${Object.keys(ITEMS).map((k) => `<div class="inv-it"><span>${ITEMS[k].ic}</span><b>×${S.items[k] || 0}</b><small>${ITEMS[k].nm}</small></div>`).join("")}</div>
    </div>`;
}
window.setDexTab = (t) => { dexTab = t; renderDex(); RSND.tap(); };
window.toast = toast;

/* ══════════ クエストけいじばん（ミッション） ══════════ */
const DAILY_MISSIONS = [
  { id: "login", nm: "ぼうけんに でる（ログイン）", n: 1, rew: 10 },
  { id: "win", nm: "たたかいに 3かい かつ", n: 3, rew: 10 },
  { id: "explore", nm: "たんけんを 1かい おえる", n: 1, rew: 10 },
  { id: "arena", nm: "かくとうじょうで 1かい たたかう", n: 1, rew: 10 },
  { id: "buy", nm: "おみせで かいものを する", n: 1, rew: 10 },
];
const WEEKLY_MISSIONS = [
  { id: "win", nm: "たたかいに 15かい かつ", n: 15, rew: 40 },
  { id: "tower", nm: "しれんのとうを 3かい とっぱ", n: 3, rew: 30 },
  { id: "explore", nm: "たんけんを 3かい おえる", n: 3, rew: 30 },
  { id: "arena", nm: "かくとうじょうで 5かい たたかう", n: 5, rew: 30 },
];
function trackMission(id) {
  rollDaily();
  S.daily.c[id] = (S.daily.c[id] || 0) + 1;
  S.weekly.c[id] = (S.weekly.c[id] || 0) + 1;
  save();
  DAILY_MISSIONS.forEach((m) => {
    if ((S.daily.c[m.id] || 0) >= m.n) awardXeva("dm_" + today() + "_" + m.id, m.rew, "クエスト: " + m.nm);
  });
  WEEKLY_MISSIONS.forEach((m) => {
    if ((S.weekly.c[m.id] || 0) >= m.n) awardXeva("wm_" + S.weekly.wk + "_" + m.id, m.rew, "しゅうかんクエスト: " + m.nm);
  });
  if (DAILY_MISSIONS.every((m) => (S.daily.c[m.id] || 0) >= m.n)) awardXeva("dall_" + today(), 30, "デイリークエスト ぜんたっせい");
}
function renderMissions() {
  rollDaily();
  const mrow = (m, c, doneKey) => {
    const cur = Math.min(m.n, c[m.id] || 0);
    const done = cur >= m.n;
    const claimed = S.xevaKeys[doneKey];
    return `<div class="mi-row${done ? " done" : ""}">
      <div><b>${m.nm}</b><small>${cur}/${m.n}</small></div>
      <span class="mi-rew">${done && claimed ? "✔ うけとりずみ" : `<img src="../../XEVA.png" class="ti">${m.rew}`}</span>
    </div>`;
  };
  $("#view-missions").innerHTML = `
    <div class="dqwin pad">
      <div class="dq-h">🪧 きょうのクエスト <span class="hint">たっせいで じどううけとり・ぜんたっせい+30</span></div>
      ${DAILY_MISSIONS.map((m) => mrow(m, S.daily.c, "dm_" + today() + "_" + m.id)).join("")}
    </div>
    <div class="dqwin pad">
      <div class="dq-h">📜 こんしゅうのクエスト</div>
      ${WEEKLY_MISSIONS.map((m) => mrow(m, S.weekly.c, "wm_" + S.weekly.wk + "_" + m.id)).join("")}
    </div>
    <div class="dqwin pad">
      <div class="dq-h">🏅 いさおし（じっせき） <span class="hint">${Object.keys(S.ach).length}/${ACHIEVEMENTS.length}</span></div>
      ${ACHIEVEMENTS.map((a) => {
        const got = !!S.ach[a.id];
        return `<div class="mi-row${got ? " done" : ""}">
          <div><b>${got ? "🏅" : "⬜"} ${a.nm}</b><small>${a.d} → しょうごう「${a.title}」</small></div>
          ${got ? `<button class="ttl-btn${S.curTitle === a.title ? " on" : ""}" onclick="setTitle('${esc(a.title)}')">${S.curTitle === a.title ? "そうびちゅう" : "つける"}</button>` : ""}
        </div>`;
      }).join("")}
    </div>`;
}
window.setTitle = (t) => { S.curTitle = t; save(); RSND.ok(); renderMissions(); };
function checkAchievements() {
  ACHIEVEMENTS.forEach((a) => {
    if (!S.ach[a.id] && a.check(S)) {
      S.ach[a.id] = Date.now(); save();
      toast(`🏅 いさおし「${a.nm}」— しょうごう「${a.title}」を てにいれた！`);
      RSND.chime();
    }
  });
}

/* ══════════ 起動 ══════════ */
window.addEventListener("DOMContentLoaded", () => {
  const fill = $("#spFill");
  let p = 0;
  const iv = setInterval(() => {
    p = Math.min(100, p + 8 + Math.random() * 14);
    fill.style.width = p + "%";
    if (p >= 100) {
      clearInterval(iv);
      setTimeout(() => {
        $("#splash").classList.add("out");
        setTimeout(() => {
          $("#splash").remove();
          if (!S.introSeen) playMovie(showTitle);
          else showTitle();
        }, 550);
      }, 300);
    }
  }, 110);
  $("#backTown").onclick = () => switchView("home");
  $("#muteBtn").onclick = () => { $("#muteBtn").textContent = RSND.toggle() ? "🔇" : "🔊"; };
  $("#muteBtn").textContent = RSND.muted() ? "🔇" : "🔊";
  window.addEventListener("xeva:change", refreshTop);
});
