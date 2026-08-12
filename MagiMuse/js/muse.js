/* ============================================================
   MagiMuse — 美少女ゲーム × 学習管理
   ・本気の勉強セッションで MP（ミューズポイント）を獲得
   ・MP でストーリー（ビジュアルノベル）を読み進め、星図の星を灯す
   ・登場キャラは XEVAガチャの SSR のみ。2章以降はキャラの所持が必要
   ============================================================ */
"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => (s == null ? "" : String(s)).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Number(n || 0).toLocaleString();
const todayStr = () => new Date().toISOString().slice(0, 10);
const CHARS_BASE = "../chars/";

/* ── 定数 ── */
const SAVE_KEY = "magimuse_v1";
const MP_PER_MIN = 2.4;            // 1分の集中 = 2.4MP
const XEVA_PER_MIN = 2;            // 1分 = 2 XEVA
const XEVA_DAILY_CAP = 120;        // 1日の獲得上限
const SUBJECTS = [
  { id: "eng", nm: "英語", hero: "kotomi", em: "🇬🇧" },
  { id: "math", nm: "数学", hero: "riko", em: "➗" },
  { id: "jp", nm: "国語", hero: "kaho", em: "📖" },
  { id: "sci", nm: "理科", hero: "nana", em: "🔭" },
  { id: "soc", nm: "社会", hero: "rea", em: "🗺️" },
  { id: "free", nm: "その他", hero: "rinon", em: "✨" },
];
const DURATIONS = [15, 25, 45, 60];
const AFF_LV = [
  { at: 0, nm: "出会い" }, { at: 10, nm: "友だち" }, { at: 25, nm: "なかよし" },
  { at: 45, nm: "しんゆう" }, { at: 70, nm: "とくべつ" },
];

/* ── セーブ ── */
function freshP() {
  return { mp: 0, cleared: {}, aff: {}, sessions: [], daily: { date: "", xeva: 0 }, streak: 0, lastStudy: "", missionDone: false, updatedAt: 0 };
}
let P = freshP();
function load() { try { const r = localStorage.getItem(SAVE_KEY); if (r) P = Object.assign(freshP(), JSON.parse(r)); } catch (e) {} }
function save() { P.updatedAt = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(P)); } catch (e) {} }

/* ── XEVA / ガチャ所持 ── */
function xevaBal() { return window.XEVA ? XEVA.getBalance() : 0; }
function gachaOwned() {
  try { const g = JSON.parse(localStorage.getItem("xeva_gacha_v1") || "null"); return (g && g.owned) || {}; } catch (e) { return {}; }
}
function ownsChar(id) { return !!gachaOwned()[id]; }

/* ── 好感度 ── */
function affOf(id) { return (P.aff && P.aff[id]) || 0; }
function affLevel(id) {
  const v = affOf(id);
  let lv = AFF_LV[0];
  AFF_LV.forEach((l) => { if (v >= l.at) lv = l; });
  return lv;
}
function addAff(id, n) { P.aff = P.aff || {}; P.aff[id] = Math.min(99, (P.aff[id] || 0) + n); save(); }

/* ── ルート進行 ── */
function chaptersOf(hero) { return MUSE_STORY.routes[hero] || []; }
function clearedCount(hero) { return chaptersOf(hero).filter((c) => P.cleared[c.id]).length; }
function allRoutesDone() { return MUSE_HEROINES.filter((h) => h !== "rinon").every((h) => clearedCount(h) >= 3); }
function chapterState(hero, idx) {
  const chs = chaptersOf(hero);
  const ch = chs[idx]; if (!ch) return null;
  if (P.cleared[ch.id]) return { st: "done", ch };
  if (idx > 0 && !P.cleared[chs[idx - 1].id]) return { st: "locked", ch, why: "前の章をクリアすると読めます" };
  if (ch.needOwn && !ownsChar(hero)) return { st: "needown", ch, why: "XEVAガチャで「" + MUSE_CAST[hero].nm + "」を仲間にすると読めます" };
  if (ch.finale && !(clearedCount("kotomi") + clearedCount("riko") + clearedCount("kaho") + clearedCount("nana") + clearedCount("rea") >= 15 && P.cleared["rinon2"])) {
    return { st: "locked", ch, why: "すべてのヒロインの物語を見届けると解放されます" };
  }
  if (P.mp < ch.cost) return { st: "needmp", ch, why: "MPが足りません（勉強すると貯まります）" };
  return { st: "ready", ch };
}

/* ── 星図（星の点灯率: ルート60% + その科目の勉強時間40%） ── */
function subjMinutes(subjId) {
  return (P.sessions || []).filter((s) => s.subj === subjId).reduce((a, s) => a + s.min, 0);
}
function starLight(hero) {
  const route = clearedCount(hero) / 3;
  const subj = SUBJECTS.find((s) => s.hero === hero);
  const study = Math.min(1, subjMinutes(subj ? subj.id : "free") / 120);
  return Math.round((route * 0.6 + study * 0.4) * 100);
}
function totalLight() {
  return Math.round(MUSE_HEROINES.reduce((a, h) => a + starLight(h), 0) / MUSE_HEROINES.length);
}

/* ════════════════════════════════════════════
   画面遷移
   ════════════════════════════════════════════ */
let view = "home";
function go(v) {
  view = v;
  $$("main.view").forEach((m) => m.classList.toggle("on", m.id === "v-" + v));
  $$("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
  ({ home: rHome, story: rStory, study: rStudy, chars: rChars, log: rLog }[v] || (() => {}))();
  window.scrollTo(0, 0);
}
window.go = go;
function paintTop() {
  const mp = $("#topMp"); if (mp) mp.textContent = fmt(Math.floor(P.mp));
  const xv = $("#topXeva"); if (xv) xv.textContent = fmt(xevaBal());
}
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2600); }

/* ════════════════════════════════════════════
   ホーム（星図）
   ════════════════════════════════════════════ */
const STAR_POS = { kotomi: [50, 16], riko: [80, 34], kaho: [72, 68], nana: [28, 68], rea: [20, 34], rinon: [50, 44] };
function starMapSVG() {
  const edges = [["kotomi", "riko"], ["riko", "kaho"], ["kaho", "nana"], ["nana", "rea"], ["rea", "kotomi"], ["rinon", "kotomi"], ["rinon", "riko"], ["rinon", "kaho"], ["rinon", "nana"], ["rinon", "rea"]];
  let s = '<svg viewBox="0 0 100 84" class="starmap">';
  edges.forEach(([a, b]) => {
    const [x1, y1] = STAR_POS[a], [x2, y2] = STAR_POS[b];
    const lit = starLight(a) >= 100 && starLight(b) >= 100;
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="edge ${lit ? "lit" : ""}"/>`;
  });
  MUSE_HEROINES.forEach((h) => {
    const [x, y] = STAR_POS[h];
    const pct = starLight(h);
    const full = pct >= 100;
    const c = MUSE_CAST[h].color;
    s += `<g class="star ${full ? "full" : ""}" onclick="openRoute('${h}')" style="cursor:pointer">
      ${full ? `<circle cx="${x}" cy="${y}" r="7.5" fill="${c}" opacity=".22"><animate attributeName="r" values="6.5;9;6.5" dur="2.6s" repeatCount="indefinite"/></circle>` : ""}
      <circle cx="${x}" cy="${y}" r="4.2" fill="${full ? c : "#1c2647"}" stroke="${c}" stroke-width="1" opacity="${0.35 + pct / 100 * 0.65}"/>
      <text x="${x}" y="${y + 1.4}" text-anchor="middle" font-size="3.6" fill="#fff" font-weight="900">${pct}</text>
      <text x="${x}" y="${y + 9.4}" text-anchor="middle" font-size="3.2" fill="#9fb0dd">${MUSE_CAST[h].star}</text>
    </g>`;
  });
  return s + "</svg>";
}
function rHome() {
  const acc = (() => { try { return JSON.parse(localStorage.getItem("xeva_account_v1") || "{}"); } catch (e) { return {}; } })();
  const done = Object.keys(P.cleared).length;
  const totalCh = 1 + MUSE_HEROINES.reduce((a, h) => a + chaptersOf(h).length, 0);
  $("#v-home").innerHTML = `
    <div class="hero-card">
      <div class="hc-hi">ようこそ、勉強部へ</div>
      <div class="hc-nm">${esc(acc.name || "部員")} さん</div>
      <div class="hc-row">
        <span class="chip">🌟 星図 ${totalLight()}%</span>
        <span class="chip">📖 物語 ${done}/${totalCh}</span>
        <span class="chip">🔥 連続 ${P.streak || 0}日</span>
      </div>
    </div>
    <div class="card map-card">
      <div class="card-t">🌌 知識の星図 <small>星をタップで物語へ</small></div>
      ${starMapSVG()}
      <p class="hint">星は「物語を読む(60%)」と「その科目の勉強(40%)」で灯ります。すべて灯すと……？</p>
    </div>
    <div class="two">
      <button class="big-act study" onclick="go('study')"><span>✏️</span>べんきょうする<small>MP +${Math.round(MP_PER_MIN * 25)} /25分</small></button>
      <button class="big-act story" onclick="go('story')"><span>📖</span>物語を読む<small>MPをつかう</small></button>
    </div>
    ${P.cleared.prologue ? "" : `<button class="prologue-bn" onclick="playChapter('prologue')">✨ まずはプロローグを読む（無料）</button>`}
    <div class="card note-card">
      <b>🎓 このアプリについて</b>
      <p>MagiMuse は「本気の勉強」で物語が進む学習アプリです。勉強セッションを完了すると <b>MP</b> と <b>XEVA</b>（1日${XEVA_DAILY_CAP}まで）を獲得。ヒロインは <b>XEVAガチャのSSRキャラ</b> — 2章以降はガチャで仲間にすると読めます。</p>
    </div>`;
  paintTop();
}

/* ════════════════════════════════════════════
   ストーリー（ルート一覧）
   ════════════════════════════════════════════ */
function rStory() {
  const routes = MUSE_HEROINES.map((h) => {
    const c = MUSE_CAST[h];
    const owned = ownsChar(h);
    const lv = affLevel(h);
    const chs = chaptersOf(h).map((ch, i) => {
      const st = chapterState(h, i);
      const cls = st.st === "done" ? "done" : st.st === "ready" ? "ready" : "locked";
      const badge = st.st === "done" ? "✓ 読了" : st.st === "ready" ? `▶ ${ch.cost}MP` : st.st === "needmp" ? `🔒 ${ch.cost}MP` : st.st === "needown" ? "🔒 ガチャ" : "🔒";
      return `<button class="ch ${cls}" onclick="tryChapter('${h}',${i})"><span class="ct">${esc(ch.title)}</span><span class="cb">${badge}</span></button>`;
    }).join("");
    return `<div class="route-card" id="route-${h}">
      <div class="rc-head" style="--c:${c.color}">
        <img src="${CHARS_BASE + c.file}" alt="${c.nm}">
        <div class="rc-info">
          <b>${c.nm}</b><span class="rc-role">${esc(c.role)} ・ ${c.subj}担当</span>
          <span class="rc-aff">💗 ${lv.nm}（好感度 ${affOf(h)}）</span>
          <div class="rc-star">⭐ ${c.star} ${starLight(h)}%</div>
        </div>
        ${owned ? '<span class="own">仲間</span>' : '<span class="own no">未加入</span>'}
      </div>
      <div class="rc-chs">${chs}</div>
    </div>`;
  }).join("");
  $("#v-story").innerHTML = `
    <div class="h1">📖 ストーリー</div>
    <button class="ch ${P.cleared.prologue ? "done" : "ready"}" style="margin-bottom:12px" onclick="playChapter('prologue')">
      <span class="ct">${esc(MUSE_STORY.prologue.title)}</span><span class="cb">${P.cleared.prologue ? "✓ 読了（もう一度）" : "▶ 無料"}</span>
    </button>
    ${routes}
    <p class="hint" style="text-align:center">所持MP: <b>${fmt(Math.floor(P.mp))}</b> ／ 2章以降は XEVAガチャでキャラを仲間にすると解放されます</p>`;
  paintTop();
}
window.openRoute = (h) => { go("story"); setTimeout(() => { const el = $("#route-" + h); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60); };
window.tryChapter = (hero, idx) => {
  const st = chapterState(hero, idx);
  if (!st) return;
  if (st.st === "done") { startVN(st.ch, hero, true); return; }   // 読了済みは無料でもう一度
  if (st.st !== "ready") { toast("🔒 " + (st.why || "まだ読めません")); return; }
  if (!confirm(`「${st.ch.title}」を読みます。\nMP ${st.ch.cost} を消費します。よろしいですか？`)) return;
  P.mp -= st.ch.cost; save();
  startVN(st.ch, hero, false);
};
window.playChapter = (id) => {
  if (id === "prologue") startVN(MUSE_STORY.prologue, null, !!P.cleared.prologue);
};

/* ════════════════════════════════════════════
   ビジュアルノベル プレイヤー
   ════════════════════════════════════════════ */
let VN = null;
function startVN(chapter, hero, replay) {
  VN = { ch: chapter, hero, replay, i: 0, typing: false, timer: null };
  $("#vn").classList.add("on");
  vnShow();
}
function vnBg(key) {
  const bgs = {
    sea: "linear-gradient(180deg,#8fd3ff 0%,#bfe9ff 55%,#ffe9b8 100%)",
    sunset: "linear-gradient(180deg,#ff9d6b 0%,#ff6b8f 50%,#5b3fa0 100%)",
    night: "linear-gradient(180deg,#0a1035 0%,#1c2647 60%,#2c3a6b 100%)",
    classroom: "linear-gradient(180deg,#ffe9c8 0%,#ffd9a0 60%,#c88a52 100%)",
    rooftop: "linear-gradient(180deg,#20306b 0%,#4a5fae 55%,#ff9d6b 100%)",
    festival: "linear-gradient(180deg,#2b1055 0%,#7546a0 55%,#ff6b8f 100%)",
    library: "linear-gradient(180deg,#e8d8b8 0%,#c8a878 60%,#8a6a48 100%)",
    dawn: "linear-gradient(180deg,#bfe9ff 0%,#ffe9d8 55%,#fff7e8 100%)",
  };
  return bgs[key] || bgs.sunset;
}
function vnShow() {
  const line = VN.ch.lines[VN.i];
  if (!line) { vnEnd(); return; }
  if (line.bg) $("#vn").style.background = vnBg(line.bg);
  const stage = $("#vn-stage");
  const isNarr = line.sp === "n";
  const isMe = line.sp === "me";
  const cast = MUSE_CAST[line.sp];
  /* 立ち絵 */
  if (cast) {
    stage.innerHTML = `<img class="vn-chara" src="${CHARS_BASE + cast.file}" alt="${cast.nm}">`;
  } else if (!isNarr && !isMe) stage.innerHTML = "";
  else stage.innerHTML = stage.innerHTML;   // 地の文・主人公は前の立ち絵を残す
  /* 名前プレート */
  const acc = (() => { try { return JSON.parse(localStorage.getItem("xeva_account_v1") || "{}"); } catch (e) { return {}; } })();
  const nm = isNarr ? "" : isMe ? (acc.name || "あなた") : cast ? cast.nm : "";
  const plate = $("#vn-name");
  plate.textContent = nm;
  plate.style.display = nm ? "inline-block" : "none";
  plate.style.background = cast ? cast.color : "#5b6bff";
  /* タイプライター */
  const tx = $("#vn-text");
  tx.classList.toggle("narr", isNarr);
  clearInterval(VN.timer);
  const full = line.text;
  let k = 0; VN.typing = true;
  tx.textContent = "";
  VN.timer = setInterval(() => {
    k += 2;
    tx.textContent = full.slice(0, k);
    if (k >= full.length) { clearInterval(VN.timer); VN.typing = false; }
  }, 24);
  $("#vn-prog").textContent = (VN.i + 1) + " / " + VN.ch.lines.length;
}
window.vnNext = () => {
  if (!VN) return;
  const line = VN.ch.lines[VN.i];
  if (VN.typing) { clearInterval(VN.timer); VN.typing = false; $("#vn-text").textContent = line.text; return; }
  VN.i++;
  vnShow();
};
window.vnSkip = () => { if (VN && confirm("この章を最後までスキップしますか？")) vnEnd(); };
function vnEnd() {
  const first = !P.cleared[VN.ch.id];
  if (first) {
    P.cleared[VN.ch.id] = Date.now();
    if (VN.hero) addAff(VN.hero, 10);
    save();
  }
  const hero = VN.hero;
  $("#vn").classList.remove("on");
  clearInterval(VN.timer);
  VN = null;
  if (first) {
    if (hero) toast(`💗 ${MUSE_CAST[hero].nm} の好感度が上がった！（${affLevel(hero).nm}）`);
    else toast("📖 プロローグを読みました！勉強してMPを貯めよう");
    if (hero && clearedCount(hero) >= 3) setTimeout(() => toast(`⭐ ${MUSE_CAST[hero].star} が大きく輝いた！`), 1600);
    if (P.cleared.rinon3) setTimeout(showFinaleReward, 2200);
  }
  go(view);
}
function showFinaleReward() {
  if (P.finaleRewarded) return;
  P.finaleRewarded = true; save();
  if (window.XEVA) XEVA.add(1000, "MagiMuse 星図コンプリート");
  alert("🌌 知識の星図・全点灯！\n\n第一部完結おめでとうございます！\n記念に 1,000 XEVA をプレゼント。\nこれからも勉強部の活動（あなたの勉強）は続きます！");
  paintTop();
}

/* ════════════════════════════════════════════
   勉強セッション（タイマー）
   ════════════════════════════════════════════ */
let SES = null;   // { subj, min, left, timer, running }
let selSubj = "eng", selMin = 25;
function rStudy() {
  if (SES) { renderSession(); return; }
  const subjBtns = SUBJECTS.map((s) => {
    const hero = MUSE_CAST[s.hero];
    return `<button class="subj ${selSubj === s.id ? "on" : ""}" onclick="pickSubj('${s.id}')" style="--c:${hero.color}">
      <span class="se">${s.em}</span><b>${s.nm}</b><small>${hero.nm}</small></button>`;
  }).join("");
  const durBtns = DURATIONS.map((m) => `<button class="dur ${selMin === m ? "on" : ""}" onclick="pickMin(${m})">${m}分<small>+${Math.round(m * MP_PER_MIN)}MP</small></button>`).join("");
  const today = (P.daily.date === todayStr()) ? P.daily.xeva : 0;
  $("#v-study").innerHTML = `
    <div class="h1">✏️ べんきょうセッション</div>
    <div class="card">
      <div class="card-t">科目をえらぶ <small>担当ヒロインの星が灯りやすくなる</small></div>
      <div class="subj-grid">${subjBtns}</div>
    </div>
    <div class="card">
      <div class="card-t">時間をえらぶ</div>
      <div class="dur-row">${durBtns}</div>
    </div>
    <button class="start-btn" onclick="startSession()">▶ セッション開始</button>
    <p class="hint" style="text-align:center">完了で MP と XEVA（今日 ${today}/${XEVA_DAILY_CAP}）を獲得。途中でやめると獲得は半分以下になります。</p>`;
  paintTop();
}
window.pickSubj = (id) => { selSubj = id; rStudy(); };
window.pickMin = (m) => { selMin = m; rStudy(); };
window.startSession = () => {
  SES = { subj: selSubj, min: selMin, left: selMin * 60, timer: null, running: true, started: Date.now() };
  SES.timer = setInterval(tickSession, 1000);
  renderSession();
};
function tickSession() {
  if (!SES || !SES.running) return;
  SES.left--;
  const t = $("#ses-time");
  if (t) t.textContent = fmtTime(SES.left);
  const bar = $("#ses-bar i");
  if (bar) bar.style.width = (100 - SES.left / (SES.min * 60) * 100) + "%";
  if (SES.left <= 0) finishSession(true);
}
function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}
function renderSession() {
  const subj = SUBJECTS.find((s) => s.id === SES.subj);
  const hero = MUSE_CAST[subj.hero];
  const cheers = [
    hero.nm + "「いっしょにがんばろ！」", hero.nm + "「その調子です！」", hero.nm + "「あとちょっと！」",
  ];
  $("#v-study").innerHTML = `
    <div class="ses-card" style="--c:${hero.color}">
      <img class="ses-hero" src="${CHARS_BASE + hero.file}" alt="">
      <div class="ses-subj">${subj.em} ${subj.nm} ・ ${SES.min}分セッション</div>
      <div class="ses-time" id="ses-time">${fmtTime(SES.left)}</div>
      <div class="ses-bar" id="ses-bar"><i></i></div>
      <div class="ses-cheer">${esc(cheers[(Math.random() * cheers.length) | 0])}</div>
      <div class="ses-btns">
        <button class="ghost" onclick="abortSession()">やめる</button>
        <button class="ghost" onclick="togglePause()" id="ses-pause">⏸ 一時停止</button>
      </div>
      <p class="hint">画面を閉じてもOK。机に向かうことに集中しよう。</p>
    </div>`;
  paintTop();
}
window.togglePause = () => {
  if (!SES) return;
  SES.running = !SES.running;
  const b = $("#ses-pause"); if (b) b.textContent = SES.running ? "⏸ 一時停止" : "▶ 再開";
};
window.abortSession = () => {
  if (!SES) return;
  const doneMin = Math.floor((SES.min * 60 - SES.left) / 60);
  if (doneMin < 3) {
    if (confirm("3分未満のため獲得なしで終了します。よろしいですか？")) { clearInterval(SES.timer); SES = null; rStudy(); }
    return;
  }
  if (!confirm(`ここまでの ${doneMin} 分ぶんだけ受け取って終了しますか？（獲得は半分になります）`)) return;
  finishSession(false, doneMin);
};
function finishSession(complete, partialMin) {
  clearInterval(SES.timer);
  const min = complete ? SES.min : partialMin;
  const mult = complete ? 1 : 0.5;
  const mp = Math.round(min * MP_PER_MIN * mult);
  P.mp += mp;
  /* XEVA（1日上限あり） */
  const t = todayStr();
  if (P.daily.date !== t) P.daily = { date: t, xeva: 0 };
  let xeva = Math.round(min * XEVA_PER_MIN * mult);
  xeva = Math.max(0, Math.min(xeva, XEVA_DAILY_CAP - P.daily.xeva));
  if (xeva > 0 && window.XEVA) { XEVA.add(xeva, "MagiMuse 勉強セッション"); P.daily.xeva += xeva; }
  /* 記録・ストリーク・好感度 */
  P.sessions.push({ d: t, subj: SES.subj, min });
  if (P.sessions.length > 400) P.sessions.shift();
  if (P.lastStudy !== t) {
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    P.streak = (P.lastStudy === y) ? (P.streak || 0) + 1 : 1;
    P.lastStudy = t;
  }
  const subj = SUBJECTS.find((s) => s.id === SES.subj);
  if (complete) addAff(subj.hero, 2);
  /* 初回ミッション */
  let missionMsg = "";
  if (complete && !P.missionDone) {
    P.missionDone = true;
    if (window.XEVA && XEVA.completeMission) {
      const r = XEVA.completeMission("magimuse_play");
      if (r > 0) missionMsg = `<div class="rw-row">🎖️ 初セッションミッション <b>+${r} XEVA</b></div>`;
    }
  }
  save();
  const hero = MUSE_CAST[subj.hero];
  $("#v-study").innerHTML = `
    <div class="ses-card done" style="--c:${hero.color}">
      <img class="ses-hero" src="${CHARS_BASE + hero.file}" alt="">
      <div class="ses-done-t">${complete ? "🎉 セッション完了！" : "☕ おつかれさま"}</div>
      <div class="ses-cheer">${esc(hero.nm)}「${complete ? "すごい！ほんきの " + min + "分だったね！" : "むりは禁物。また続きをやろうね"}」</div>
      <div class="rw-box">
        <div class="rw-row">🌟 ミューズポイント <b>+${mp} MP</b></div>
        ${xeva > 0 ? `<div class="rw-row">💰 XEVA <b>+${xeva}</b> <small>（今日 ${P.daily.xeva}/${XEVA_DAILY_CAP}）</small></div>` : ""}
        ${complete ? `<div class="rw-row">💗 ${esc(hero.nm)} の好感度 <b>+2</b></div>` : ""}
        ${missionMsg}
      </div>
      <div class="ses-btns">
        <button class="primary" onclick="SESdone()">OK</button>
      </div>
    </div>`;
  SES = null;
  paintTop();
}
window.SESdone = () => { rStudy(); go("home"); };

/* ════════════════════════════════════════════
   キャラ図鑑（深掘りプロフィール）
   ════════════════════════════════════════════ */
function rChars() {
  const rows = MUSE_HEROINES.map((h) => {
    const c = MUSE_CAST[h];
    const owned = ownsChar(h);
    const lv = affLevel(h);
    return `<div class="prof-card" style="--c:${c.color}">
      <img src="${CHARS_BASE + c.file}" alt="${c.nm}" class="${owned ? "" : "gray"}">
      <div class="prof-body">
        <div class="prof-nm">${c.nm} <span class="prof-ssr">SSR</span> ${owned ? "" : '<span class="prof-lock">未加入（XEVAガチャ）</span>'}</div>
        <div class="prof-role">${esc(c.role)} ／ ${c.subj}担当 ／ ⭐${c.star}</div>
        <div class="prof-like">すき: ${esc(c.like)}</div>
        <p class="prof-bio">${esc(c.bio)}</p>
        <div class="prof-aff">💗 ${lv.nm}（${affOf(h)}）・📖 ${clearedCount(h)}/3章</div>
      </div>
    </div>`;
  }).join("");
  const cameos = Object.values(MUSE_CAST).filter((c) => c.cameo).map((c) =>
    `<div class="cameo"><img src="${CHARS_BASE + c.file}" alt=""><div><b>${c.nm}</b><small>${esc(c.role)}</small><p>${esc(c.bio)}</p></div></div>`).join("");
  $("#v-chars").innerHTML = `
    <div class="h1">💗 キャラクター</div>
    <p class="hint" style="margin-bottom:12px">登場するのは XEVAガチャの SSR キャラのみ。仲間にすると2章以降が解放されます。</p>
    ${rows}
    <div class="card"><div class="card-t">🎭 カメオ出演</div>${cameos}</div>`;
  paintTop();
}

/* ════════════════════════════════════════════
   記録（学習ログ）
   ════════════════════════════════════════════ */
function rLog() {
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const min = (P.sessions || []).filter((s) => s.d === d).reduce((a, s) => a + s.min, 0);
    week.push({ d: d.slice(5).replace("-", "/"), min });
  }
  const max = Math.max(60, ...week.map((w) => w.min));
  const bars = week.map((w) => `<div class="wbar"><i style="height:${w.min / max * 100}%"></i><span class="wv">${w.min ? w.min + "分" : ""}</span><span class="wd">${w.d}</span></div>`).join("");
  const bySubj = SUBJECTS.map((s) => ({ s, min: subjMinutes(s.id) })).filter((x) => x.min > 0);
  const total = (P.sessions || []).reduce((a, s) => a + s.min, 0);
  $("#v-log").innerHTML = `
    <div class="h1">📊 学習の記録</div>
    <div class="stat-grid">
      <div class="stat"><b>${fmt(total)}</b><span>累計 分</span></div>
      <div class="stat"><b>${P.streak || 0}</b><span>連続日数</span></div>
      <div class="stat"><b>${(P.sessions || []).length}</b><span>セッション数</span></div>
      <div class="stat"><b>${fmt(Math.floor(P.mp))}</b><span>所持MP</span></div>
    </div>
    <div class="card"><div class="card-t">この1週間</div><div class="week">${bars}</div></div>
    <div class="card"><div class="card-t">科目べつ</div>
      ${bySubj.length ? bySubj.map((x) => `<div class="subj-row"><span>${x.s.em} ${x.s.nm}</span><div class="sbar"><i style="width:${Math.min(100, x.min / Math.max(...bySubj.map((y) => y.min)) * 100)}%;background:${MUSE_CAST[x.s.hero].color}"></i></div><b>${x.min}分</b></div>`).join("") : '<p class="hint">まだ記録がありません。最初のセッションを始めよう！</p>'}
    </div>`;
  paintTop();
}

/* ════════════════════════════════════════════
   起動
   ════════════════════════════════════════════ */
function boot() {
  load();
  go("home");
  window.addEventListener("xeva:change", paintTop);
}
boot();
