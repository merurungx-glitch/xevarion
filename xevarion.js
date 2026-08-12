/* ============================================================
   XEVARION Portal — v5 scripts
   ============================================================ */
"use strict";

/* ───── SCROLL REVEAL ───── */
(function reveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();

/* ───── NAV ACTIVE SECTION ───── */
(function navActive() {
  const sections = document.querySelectorAll("section[id], header[id]");
  const links = document.querySelectorAll(".nav-links a");
  addEventListener("scroll", () => {
    const y = scrollY + 120;
    sections.forEach((sec) => {
      if (y >= sec.offsetTop && y < sec.offsetTop + sec.offsetHeight) {
        links.forEach((a) => (a.style.color = ""));
        const active = document.querySelector(`.nav-links a[href="#${sec.id}"]`);
        if (active) active.style.color = "#fff";
      }
    });
  }, { passive: true });
})();

/* ───── HAMBURGER ───── */
(function hamburger() {
  const btn = document.getElementById("hamburgerBtn");
  const drawer = document.getElementById("mobileDrawer");
  if (!btn || !drawer) return;
  btn.addEventListener("click", () => { btn.classList.toggle("open"); drawer.classList.toggle("open"); });
  drawer.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => { btn.classList.remove("open"); drawer.classList.remove("open"); }));
})();

/* ============================================================
   お知らせ モーダル + 既読トラッキング
   ============================================================ */
const LS_LAST_VISIT = "xev_last_visit_news";
const LS_DISMISSED  = "xev_dismissed_news_date";
const SS_SHOWN      = "xev_shown_this_session";

const PREV_VISIT = localStorage.getItem(LS_LAST_VISIT) || "2000-01-01";

function getNewestDate() {
  const dates = [...document.querySelectorAll("#newsBody .nm-item[data-date]")]
    .map((el) => el.dataset.date).sort().reverse();
  return dates[0] || "2000-01-01";
}

function markNewItems() {
  const newDiv = document.getElementById("newDivider");
  const oldDiv = document.getElementById("oldDivider");
  const items = [...document.querySelectorAll("#newsBody .nm-item")];
  let count = 0;
  items.forEach((item) => {
    const d = item.dataset.date || "2000-01-01";
    if (d > PREV_VISIT) {
      item.classList.add("is-new");
      const h = item.querySelector(".nm-h");
      if (h && !h.querySelector(".nm-new-badge")) {
        const b = document.createElement("span");
        b.className = "nm-new-badge"; b.textContent = "NEW";
        h.appendChild(b);
      }
      count++;
    } else {
      item.classList.remove("is-new");
      const b = item.querySelector(".nm-new-badge"); if (b) b.remove();
    }
  });
  const show = count > 0 && count < items.length;
  newDiv.style.display = show ? "flex" : "none";
  oldDiv.style.display = show ? "flex" : "none";
  const countEl = document.getElementById("newsCount");
  countEl.innerHTML = count > 0 ? `<strong>${count}件</strong> の新着があります` : "前回から変更はありません";
  return count;
}

/* ★ 2026-08-12 旧ドック（#xevaDock）を削除したので、
   バッジは<b>いまのホームのバッジ（#xhNewsBdg / #xhMailBdg / #xhMsnBdg）</b>を直接書き換える。
   以前はドックの見えないバッジに書き、それを xhSyncBadges が写していた。 */
function updateBadge() {
  const badge = document.getElementById("xhNewsBdg");
  if (!badge) return;
  const count = [...document.querySelectorAll("#newsBody .nm-item[data-date]")]
    .filter((el) => (el.dataset.date || "2000-01-01") > PREV_VISIT).length;
  if (count > 0) { badge.textContent = count > 9 ? "9+" : count; badge.classList.add("show"); }
  else badge.classList.remove("show");
}

function openNews() {
  document.getElementById("newsOverlay").classList.add("open");
  document.getElementById("newsModal").classList.add("open");
  markNewItems();
  const firstNew = document.querySelector("#newsBody .nm-item.is-new");
  if (firstNew) setTimeout(() => firstNew.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  updateDismissBtn();
  sessionStorage.setItem(SS_SHOWN, "1");
}
function closeNews() {
  document.getElementById("newsOverlay").classList.remove("open");
  document.getElementById("newsModal").classList.remove("open");
}

const EYE_SVG = '<svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke="currentColor" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>';
const CHECK_SVG = '<svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';

function dismissNews() {
  const newest = getNewestDate();
  const btn = document.getElementById("newsDismiss");
  if (localStorage.getItem(LS_DISMISSED) === newest) {
    localStorage.removeItem(LS_DISMISSED);
    btn.classList.remove("dismissed");
    btn.innerHTML = EYE_SVG + " 次の更新まで自動表示しない";
  } else {
    localStorage.setItem(LS_DISMISSED, newest);
    btn.classList.add("dismissed");
    btn.innerHTML = CHECK_SVG + " 次の更新まで自動表示しない（設定済み）";
  }
}
function updateDismissBtn() {
  const btn = document.getElementById("newsDismiss");
  if (localStorage.getItem(LS_DISMISSED) === getNewestDate()) {
    btn.classList.add("dismissed"); btn.innerHTML = CHECK_SVG + " 次の更新まで自動表示しない（設定済み）";
  } else {
    btn.classList.remove("dismissed"); btn.innerHTML = EYE_SVG + " 次の更新まで自動表示しない";
  }
}

function filterNews(tag, btn) {
  document.querySelectorAll(".nm-pills .nm-pill").forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll("#newsBody .nm-item").forEach((item) => {
    item.style.display = (tag === "all" || item.dataset.tag === tag) ? "grid" : "none";
  });
  const showDiv = tag === "all" && !!document.querySelector(".nm-item.is-new");
  document.getElementById("newDivider").style.display = showDiv ? "flex" : "none";
  document.getElementById("oldDivider").style.display = showDiv ? "flex" : "none";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeNews();
    closeMail();
    closeCdkModal();
    if (typeof closeMissions === "function") closeMissions();
    closeAccSettings();
    closeCharPickForSettings();
  }
});

addEventListener("load", () => {
  const newest = getNewestDate();
  const dismissed = localStorage.getItem(LS_DISMISSED) || "";
  const shown = sessionStorage.getItem(SS_SHOWN);
  localStorage.setItem(LS_LAST_VISIT, newest);
  updateBadge();
});

/* ============================================================
   XEVA ウォレット — 残高表示・ログインボーナス・ミッション
   ============================================================ */
/* ミッションの表示メタ。★ここに無い ID はアイコンが絵文字になってしまうので、
   xeva.js の MISSIONS にミッションを足したら必ずここにも足すこと。 */
const MISSION_META = {
  magilex_play:        { href: "MagiLex/MagiLex.html",             icon: "thumbs/MagiLex.jpg",        cta: "学ぶ" },
  magiburst_play:      { href: "MagiBurst/index.html",             icon: "thumbs/MagiBurst.jpg",      cta: "プレイ" },
  magibattle_win:      { href: "MagiBattle/index.html",            icon: "thumbs/MagiBattle.jpg",     cta: "プレイ" },
  magichainparty_play: { href: "MagiChainParty/index.html",        icon: "thumbs/MagiChainParty.jpg", cta: "プレイ" },
  magiempire_play:     { href: "MagiEmpire/MagiEmpire.html",       icon: "thumbs/MagiEmpire.jpg",     cta: "プレイ" },
  magidiamond_play:    { href: "MagiDiamond/index.html",           icon: "thumbs/MagiDiamond.jpg",    cta: "プレイ" },
  magimanor_play:      { href: "MagiManor/index.html",             icon: "thumbs/MagiManor.jpg",      cta: "探索へ" },
  magifocus_study:     { href: "MagiFocus/index.html",             icon: "thumbs/MagiFocus.jpg",      cta: "はじめる" },
  magilink_register:   { href: "MagiLink/MagiLink.html",           icon: "thumbs/MagiLink.jpg",       cta: "登録へ" },
  magiportfolio_add:   { href: "MagiPortfolio/MagiPortfolio.html", icon: "thumbs/MagiPortfolio.jpg",  cta: "追加へ" },
  magijackpot_play:    { href: "MagiJackpot/index.html",           icon: "thumbs/MagiJackpot.jpg",    cta: "プレイ" },
  xevynar_ask:         { href: "XEVYNAR/index.html",               icon: "thumbs/XEVYNAR.jpg",        cta: "きいてみる" }
};

function renderXevaBalance() {
  if (!window.XEVA) return;
  const bal = window.XEVA.getBalance().toLocaleString();
  ["xevaBal", "missionBal"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = bal;
  });
}

function renderXevaMissions() {
  if (!window.XEVA) return;
  // ── スターター ──
  const missions = window.XEVA.getMissions();
  const starterHtml = missions.map((m) => {
    const meta = MISSION_META[m.id] || {};
    const claimable = m.done && !m.claimed;
    const right = m.claimed
      ? '<div class="xeva-m-done">✓ 受取済み</div>'
      : claimable
        ? `<button class="xeva-m-claim" onclick="claimMsnStarter('${m.id}')">受け取る +${m.reward}</button>`
        : `<a class="xeva-m-go" href="${meta.href || "#"}">${meta.cta || "開く"} →</a>`;
    return `<div class="xeva-mission${m.claimed ? " done" : ""}${claimable ? " claimable" : ""}">
      <div class="xeva-m-ic">${meta.icon ? `<img src="${meta.icon}" alt="">` : "🎯"}</div>
      <div class="xeva-m-body">
        <div class="xeva-m-title">${m.title}</div>
        <div class="xeva-m-rew">報酬 <b>+${m.reward} XEVA</b>${claimable ? '　<span style="color:#e0701a;font-weight:800">達成！受け取ろう</span>' : ""}</div>
      </div>
      ${right}
    </div>`;
  }).join("");
  const starterEl = document.getElementById("missionTabStarter");
  if (starterEl) starterEl.innerHTML = starterHtml;

  // バッジは「受け取れる報酬」の数（達成・未受取）を表示
  const starterRemain = missions.filter((m) => m.done && !m.claimed).length;
  const sb = document.getElementById("msnBadgeStarter");
  if (sb) { if (starterRemain > 0) { sb.textContent = starterRemain; sb.style.display = ""; } else sb.style.display = "none"; }

  // ── ログイン ──
  renderMsnLogin();

  // ── ドックバッジ ──
  const { milestones } = window.XEVA.getLoginMilestones();
  const loginClaim = milestones.filter(ms => ms.reached && !ms.claimed).length;
  const limitedState = getLimitedState();
  const limitedClaim = LIMITED_MISSIONS.filter(m=>!limitedState[m.id]&&m.check()).length;
  // ── 図鑑コレクション ──
  renderMsnCollection();
  const totalBadge = starterRemain + loginClaim + limitedClaim + collectionClaimable();
  const badge = document.getElementById("xhMsnBdg");   /* ★ 2026-08-12 ホームのバッジへ直接 */
  if (badge) {
    if (totalBadge > 0) { badge.textContent = totalBadge; badge.classList.add("show"); }
    else badge.classList.remove("show");
  }
}

function renderMsnLogin() {
  if (!window.XEVA) return;
  const el = document.getElementById("missionTabLogin");
  if (!el) return;
  const { totalDays, milestones } = window.XEVA.getLoginMilestones();
  const lb = document.getElementById("msnBadgeLogin");
  const claimable = milestones.filter(ms => ms.reached && !ms.claimed).length;
  if (lb) { if (claimable > 0) { lb.textContent = claimable; lb.style.display = ""; } else lb.style.display = "none"; }

  const msHtml = milestones.map(ms => {
    const cls = ms.claimed ? "mm-milestone claimed" : ms.reached ? "mm-milestone reached" : "mm-milestone";
    const label = ms.days % 100 === 0 ? `<span style="color:#ffe08a">★</span> ${ms.days}<span>日</span>` : `${ms.days}<span>日</span>`;
    const btnHtml = ms.claimed
      ? '<span style="font-size:11px;color:#37e0a0;font-weight:700">✓ 受取済み</span>'
      : ms.reached
        ? `<button class="mm-milestone-claim" onclick="claimMsnLogin(${ms.days})">受け取る</button>`
        : `<button class="mm-milestone-claim" disabled>未達成</button>`;
    return `<div class="${cls}">
      <div class="mm-milestone-days">${label}</div>
      <div class="mm-milestone-rew">ログイン ${ms.days} 日達成<br><b>+${ms.reward} XEVA</b></div>
      ${btnHtml}
    </div>`;
  }).join("");

  el.innerHTML = `<div class="mm-login-days"><b>${totalDays}</b>総ログイン日数</div>${msHtml}`;
}

function claimMsnLogin(days) {
  if (!window.XEVA) return;
  const rw = window.XEVA.claimLoginMilestone(days);
  if (rw > 0) { renderXevaBalance(); renderMsnLogin(); showXevaToast(rw, "ログイン" + days + "日達成ボーナス！"); }
  renderXevaMissions();
}

function claimMsnStarter(id) {
  if (!window.XEVA || !window.XEVA.claimMission) return;
  const m = (window.XEVA.getMissions() || []).find((x) => x.id === id);
  const rw = window.XEVA.claimMission(id);
  if (rw > 0) { renderXevaBalance(); showXevaToast(m ? m.reward : rw, "ミッション報酬を受け取りました！"); }
  renderXevaMissions();
}
window.claimMsnStarter = claimMsnStarter;

let _msnTab = "starter";
function switchMsnTab(tab, btn) {
  _msnTab = tab;
  ["starter","login","limited","collection"].forEach(t => {
    const el = document.getElementById("missionTab" + t.charAt(0).toUpperCase() + t.slice(1));
    if (el) el.style.display = (t === tab) ? "" : "none";
  });
  document.querySelectorAll(".mm-tab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  if (tab === "login") renderMsnLogin();
  if (tab === "limited") renderMsnLimited();
  if (tab === "collection") renderMsnCollection();
  /* タブを変えたら先頭へ。シートの高さは固定なので、これで見た目の位置・大きさが変わらない */
  const body = document.querySelector("#missionModal .mm-body");
  if (body) body.scrollTop = 0;
}

/* ── 図鑑コンプリート報酬（シーズン別 全SSR取得で +1000 XEVA）── */
const COLLECTION_REWARD = 1000;
function getOwnedChars(){ try{ const g=JSON.parse(localStorage.getItem("xeva_gacha_v1")||"{}"); return g.owned||{}; }catch(e){ return {}; } }
function seasonSSRGroups(){
  const chars = window.XEVA ? window.XEVA.CHARS : [];
  const map = {};
  // キーは Aシリーズ="1".."7" / Bシリーズ="B1"…（シリーズ別に集計）
  chars.forEach(c=>{ if(c.rarity==="SSR" && !c.cdk && c.season>0){ const k=(c.series==="B"?"B":"")+c.season; (map[k]=map[k]||[]).push(c); } });
  return map;
}
function getCollectionState(){ try{ return JSON.parse(localStorage.getItem("xeva_collection_v1")||"{}"); }catch(e){ return {}; } }
function saveCollectionState(s){ try{ localStorage.setItem("xeva_collection_v1",JSON.stringify(s)); }catch(e){} }
function collectionClaimable(){
  const groups=seasonSSRGroups(), owned=getOwnedChars(), state=getCollectionState(); let n=0;
  Object.keys(groups).forEach(s=>{ if(groups[s].every(c=>owned[c.id]) && !state[s]) n++; });
  return n;
}
function claimCollection(season){
  const groups=seasonSSRGroups(), owned=getOwnedChars(), state=getCollectionState();
  const g=groups[season]; if(!g || state[season]) return;
  if(!g.every(c=>owned[c.id])){ alert("まだこのシーズンのSSRをすべて集めていません。"); return; }
  state[season]=Date.now(); saveCollectionState(state);
  const lbl = String(season).charAt(0)==="B" ? "Bシリーズ シーズン"+String(season).slice(1) : "シーズン"+season;
  if(window.XEVA) window.XEVA.add(COLLECTION_REWARD, "図鑑コンプリート："+lbl+" 全SSR");
  renderXevaBalance(); renderXevaMissions();
  showXevaToast(COLLECTION_REWARD, lbl+" 全SSR制覇！");
}
function renderMsnCollection(){
  const el=document.getElementById("missionTabCollection"); if(!el) return;
  const groups=seasonSSRGroups(), owned=getOwnedChars(), state=getCollectionState();
  const lb=document.getElementById("msnBadgeCollection"), claim=collectionClaimable();
  if(lb){ if(claim>0){lb.textContent=claim;lb.style.display="";}else lb.style.display="none"; }
  const seasons=Object.keys(groups).sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));
  if(!seasons.length){ el.innerHTML='<div class="mm-limited-empty">🎴 コレクション報酬は準備中です</div>'; return; }
  el.innerHTML = seasons.map(s=>{
    const g=groups[s], have=g.filter(c=>owned[c.id]).length, all=have===g.length, done=!!state[s];
    const lbl = String(s).charAt(0)==="B" ? "Bシリーズ シーズン"+String(s).slice(1) : "シーズン"+s;
    const thumbs=g.map(c=>`<img src="chars/${c.file}" title="${c.name}" alt="${c.name}" style="width:36px;height:36px;border-radius:9px;object-fit:cover;border:2px solid ${owned[c.id]?'#17a673':'rgba(56,140,220,.22)'};${owned[c.id]?'':'filter:grayscale(1);opacity:.45'}">`).join("");
    const btn = done ? '<span style="font-size:11px;color:#17a673;font-weight:700;white-space:nowrap">✓ 受取済み</span>'
      : all ? `<button class="mm-milestone-claim" onclick="claimCollection('${s}')">受け取る</button>`
      : `<button class="mm-milestone-claim" disabled>${have}/${g.length}</button>`;
    return `<div class="mm-limited-card${done?' claimed':''}">
      <div class="mm-limited-head"><span class="mm-limited-badge">図鑑</span><div class="mm-limited-title">${lbl} 全SSRコンプリート</div></div>
      <div style="display:flex;gap:7px;margin:10px 0;flex-wrap:wrap">${thumbs}</div>
      <div class="mm-limited-foot"><span class="mm-limited-exp">SSR ${have}/${g.length} 取得</span>
        <div style="display:flex;align-items:center;gap:10px"><span class="mm-limited-rew">+${COLLECTION_REWARD} XEVA</span>${btn}</div></div>
    </div>`;
  }).join("");
}

const LIMITED_MISSIONS = [
  {
    id: "s4_gacha_once",
    title: "S4記念：ガチャを1回引く",
    desc: "シーズン4開幕記念！ガチャを1回以上引こう",
    reward: 300,
    exp: "S5リリースまで",
    check: () => {
      try { const g=JSON.parse(localStorage.getItem("xeva_gacha_v1")||"{}"); return Object.keys(g.owned||{}).length > 0 || (g.history||[]).length > 0; } catch(e){ return false; }
    }
  },
  {
    id: "s4_ssr_get",
    title: "S4 SSRキャラをゲット",
    desc: "シーズン4のSSRキャラ（レア or リノン）をガチャで入手しよう",
    reward: 1000,
    exp: "S5リリースまで",
    check: () => {
      try { const g=JSON.parse(localStorage.getItem("xeva_gacha_v1")||"{}"); const o=g.owned||{}; return !!(o["rea"]||o["rinon"]); } catch(e){ return false; }
    }
  },
  {
    id: "collect_a_s3s4_ayaka",
    title: "Aシリーズ制覇：アヤカを迎える",
    desc: "AシリーズのシーズンS3（カホ・ナナ）とS4（レア・リノン）のSSRをすべて集めると、限定SSR「アヤカ」を1体もらえる！",
    reward: 0,
    grantChar: "ayaka",
    exp: "常設",
    check: () => {
      try { const g=JSON.parse(localStorage.getItem("xeva_gacha_v1")||"{}"); const o=g.owned||{}; return !!(o["kaho"]&&o["nana"]&&o["rea"]&&o["rinon"]); } catch(e){ return false; }
    }
  }
];

function getLimitedState() {
  try { return JSON.parse(localStorage.getItem("xeva_limited_v1")||"{}"); } catch(e){ return {}; }
}
function saveLimitedState(s) { try { localStorage.setItem("xeva_limited_v1",JSON.stringify(s)); } catch(e){} }

function claimLimited(id) {
  const m = LIMITED_MISSIONS.find(x=>x.id===id); if(!m) return;
  const s = getLimitedState();
  if(s[id]) return;
  if(!m.check()) { alert("まだ達成されていません。"); return; }
  s[id] = Date.now(); saveLimitedState(s);
  // キャラ付与タイプ（例：アヤカ）。ガチャの所持データに1体加える。
  if(m.grantChar){
    try {
      const g = JSON.parse(localStorage.getItem("xeva_gacha_v1")||"{}");
      g.owned = g.owned || {};
      g.owned[m.grantChar] = true;
      localStorage.setItem("xeva_gacha_v1", JSON.stringify(g));
      try{ if(window.XEVASync&&window.XEVASync.syncProfile) window.XEVASync.syncProfile(); }catch(e){}
      const ch = (window.XEVA?window.XEVA.CHARS:[]).find(c=>c.id===m.grantChar);
      alert("🎉 限定SSR「"+(ch?ch.name:m.grantChar)+"」を1体 獲得しました！\nガチャ画面の図鑑・各ゲームで使えます。");
    } catch(e){}
  }
  if(m.reward>0 && window.XEVA) window.XEVA.add(m.reward, "期間限定ミッション："+m.title);
  renderXevaBalance(); renderXevaMissions();
  if(m.reward>0) showXevaToast(m.reward, m.title + " 達成！");
  renderMsnLimited();
}

function renderMsnLimited() {
  const el = document.getElementById("missionTabLimited");
  if (!el) return;
  const state = getLimitedState();
  const lb = document.getElementById("msnBadgeLimited");
  const claimable = LIMITED_MISSIONS.filter(m=>!state[m.id]&&m.check()).length;
  if(lb){ if(claimable>0){lb.textContent=claimable;lb.style.display="";}else lb.style.display="none"; }

  const html = LIMITED_MISSIONS.map(m => {
    const done = !!state[m.id];
    const reached = m.check();
    const btnHtml = done
      ? '<span style="font-size:11px;color:#37e0a0;font-weight:700;white-space:nowrap">✓ 受取済み</span>'
      : reached
        ? `<button class="mm-milestone-claim" onclick="claimLimited('${m.id}')">受け取る</button>`
        : `<button class="mm-milestone-claim" disabled>未達成</button>`;
    return `<div class="mm-limited-card${done?' claimed':''}">
      <div class="mm-limited-head">
        <span class="mm-limited-badge">期間限定</span>
        <div class="mm-limited-title">${m.title}</div>
      </div>
      <div class="mm-limited-desc">${m.desc}</div>
      <div class="mm-limited-foot">
        <span class="mm-limited-exp">⏰ ${m.exp}</span>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="mm-limited-rew">${m.grantChar ? ("🎁 SSR「" + (((window.XEVA&&window.XEVA.CHARS)||[]).find(c=>c.id===m.grantChar)||{name:m.grantChar}).name + "」") : ("+" + m.reward + " XEVA")}</span>
          ${btnHtml}
        </div>
      </div>
    </div>`;
  }).join("");
  el.innerHTML = html || '<div class="mm-limited-empty">🎪 現在、期間限定ミッションはありません</div>';
}

function openMissions() {
  if (window.XEVA) { window.XEVA.reload(); renderXevaBalance(); renderXevaMissions(); }
  // 最初はスタータータブ
  switchMsnTab(_msnTab, document.getElementById("mmTab" + _msnTab.charAt(0).toUpperCase() + _msnTab.slice(1)));
  document.getElementById("missionOverlay").classList.add("open");
  document.getElementById("missionModal").classList.add("open");
}
function closeMissions() {
  document.getElementById("missionOverlay").classList.remove("open");
  document.getElementById("missionModal").classList.remove("open");
}

function showXevaToast(amount, label) {
  const t = document.getElementById("xevaToast");
  if (!t) return;
  const t1 = document.getElementById("xevaToastT1");
  const t2 = document.getElementById("xevaToastT2");
  const icon = t.querySelector("img");
  if (amount > 0) {
    if (icon) icon.style.display = "";
    t1.textContent = "＋" + amount + " XEVA";
    t2.textContent = label || "を獲得しました";
    t2.style.display = "";
  } else {
    // XEVA を伴わない確認メッセージ（設定変更など）
    if (icon) icon.style.display = "none";
    t1.textContent = label || "更新しました";
    t2.textContent = "";
    t2.style.display = "none";
  }
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

addEventListener("xeva:change", () => { renderXevaBalance(); renderXevaMissions(); });
addEventListener("focus", () => { if (window.XEVA) { window.XEVA.reload(); renderXevaBalance(); renderXevaMissions(); } });

/* ============================================================
   XEVARION アカウントシステム
   ============================================================ */
const SS_UNLOCKED = "xev_acc_unlocked";

async function simpleHash(s) {
  try {
    const b = new TextEncoder().encode(s);
    const h = await crypto.subtle.digest("SHA-256", b);
    return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) { return s; }
}

function getAcc() { return window.XEVA ? window.XEVA.account.get() : null; }
function saveAcc(a) { if (window.XEVA) window.XEVA.account.save(a); }
/* アイコン・ピッカー等の小さい表示は chars_s/（256px JPEG）を使う。
   chars/ の原寸は 1枚2.5MB × 42枚 あり、アイコン用途で読むとホームが重くなるため。
   ※ chars/ にキャラを追加したら chars_s/ にも 256px 版を置くこと。
     万一無くても xevarion-home.js の onerror が chars/ 原寸へ差し戻す。 */
/* ★ 保存されている charFile は古いフォルダのままのことがある（キャラの移籍・整理で
   "s5/Mion.png" → "bs1/Mion.png" のように動いた）。表示の直前に必ず正規化する。 */
function canonChar(charFile, charId) {
  return (window.XEVA && window.XEVA.canonCharFile) ? window.XEVA.canonCharFile(charFile, charId) : String(charFile || "");
}
function getCharImgPath(charFile, charId) { return charSmallPath(charFile, charId); }
/* ★ 2026-08-05: MagiBurst のキャラ（"../MagiBurst/img/..."）は
   すでに軽いサムネイルなので、拡張子を .jpg に付け替えず そのまま使う
   （.webp のキャラがいるため、付け替えると 404 になる）。
   "chars_s/" を前に付けても "../" で1つ戻るので MagiBurst/img/ に解決される。 */
function isMbFile(f) { return (window.XEVA && window.XEVA.isMbCharFile) ? window.XEVA.isMbCharFile(f) : /^\.\.\/(img|MagiBurst\/img)\//.test(String(f || "")); }
/* ★ 2026-08-10 キャラ画像は XEVARION 直下の img/ に集約（WebP統一）。
   file は "../img/Xxx.webp" なので、"chars_s/" を前に付けても "../" で打ち消され
   img/ に解決される（フォルダを消しても、この形なら各アプリを触らずに済む）。
   小さい表示は t_ 付き（300px）を使う。 */
function charThumbFile(f) {
  return (window.XEVA && window.XEVA.charThumbFile) ? window.XEVA.charThumbFile(f)
    : String(f || "").replace(/\/([^/]+)$/, "/t_$1");
}
function charSmallPath(charFile, charId) {
  const f = canonChar(charFile, charId);
  if (isMbFile(f)) return "chars_s/" + charThumbFile(f);
  return "chars_s/" + f.replace(/\.(png|jpe?g)$/i, "") + ".jpg";
}
function charFullPath(charFile, charId) { return "chars/" + canonChar(charFile, charId); }

/* account FAB icon
   ★ 2026-08-12 このボタン（#accFab）は旧ドックの中にあり、ドックごと削除した。
     いまのホームのアイコンは xevarion-home.js の xhRenderProfile が描く。
     旧レイアウトから呼ばれても落ちないよう、要素が無ければ何もしないままにしてある。 */
function renderNavUser() {
  const btn = document.getElementById("accFab");
  if (!btn) return;
  const acc = getAcc();
  if (acc && acc.charFile) {
    btn.innerHTML = `<img src="${getCharImgPath(acc.charFile)}" alt="">`;
  } else {
    btn.innerHTML = `<span class="nub-init">${acc && acc.name ? acc.name[0].toUpperCase() : "?"}</span>`;
  }
  const badge = document.getElementById("accXvBadge");
  if (badge) badge.style.display = (acc && acc.setupDone) ? "block" : "none";
}

/* ── wizard ── */
let wzSelectedChar = null;

/* ★ 2026-08-05: アイコンに選べる MagiBurst のキャラ。
   ・画像は img/ をそのまま参照する（chars/ へは絶対にコピーしない）。
   ・★ 2026-08-10 <b>アプリに関係なく全キャラ</b>が並ぶ（所持していなくても選べる）。 */
function mbIconChars() {
  return (window.XEVA && window.XEVA.mbIconChars) ? window.XEVA.mbIconChars() : [];
}
/* ピッカー1マスぶんのHTML（XEVAガチャ・MagiBurst 共通） */
function charPickItemHTML(c, sel, idPrefix, fn) {
  const src = c.mb ? charSmallPath(c.file) : ("chars/" + c.file);
  return `<div class="char-pick-item${sel ? " sel" : ""}${c.mb ? " mbchar" : ""}" id="${idPrefix}${c.id}" onclick="${fn}('${c.id}','${c.file}','${c.name}')">
      <img src="${src}" alt="${c.name}" loading="lazy">
      <div class="char-pick-nm">${c.name}</div>
      ${c.mb ? '<span class="char-pick-tag">MagiBurst</span>' : ""}
    </div>`;
}
function buildWzCharGrid() {
  const chars = window.XEVA ? window.XEVA.CHARS : [];
  const grid = document.getElementById("wzCharGrid");
  if (!grid) return;
  /* ★ 2026-08-10 登録のときから<b>全キャラ</b>を選べる（所持で絞らない）。
     ★ 2026-08-12 CDK限定キャラ（アヤカ）だけ除いていたのをやめ、<b>本当に全員</b>にした。
       アイコンは見た目だけのものなので、入手経路で絞る意味がない。 */
  const allChars = chars.slice();
  const mbChars = mbIconChars();
  const defaultChar = allChars[0] || mbChars[0];
  if (defaultChar) {
    wzSelectedChar = { id: defaultChar.id, file: defaultChar.file, name: defaultChar.name };
  }
  const sec = (t, s) => `<div class="char-pick-sec">${t}<small>${s}</small></div>`;
  grid.innerHTML =
    (allChars.length ? sec("🎰 XEVAガチャ", allChars.length + "体・所持していなくても選べます")
      + allChars.map(c => charPickItemHTML(c, c.id === (defaultChar && defaultChar.id), "wzci_", "wzPickChar")).join("") : "")
    + (mbChars.length ? sec("⚔ MagiBurst", mbChars.length + "体・所持していなくても選べます")
      + mbChars.map(c => charPickItemHTML(c, c.id === (defaultChar && defaultChar.id), "wzci_", "wzPickChar")).join("") : "");
  const nextBtn = document.getElementById("wzNext0");
  if (nextBtn) nextBtn.disabled = !defaultChar;
}

function wzPickChar(id, file, name) {
  wzSelectedChar = { id, file, name };
  document.querySelectorAll(".char-pick-item").forEach((el) => el.classList.remove("sel"));
  const el = document.getElementById("wzci_" + id);
  if (el) el.classList.add("sel");
  const nextBtn = document.getElementById("wzNext0");
  if (nextBtn) nextBtn.disabled = false;
}

/* ウィザードの入力ステップ（0〜4）。5 は完了画面。
   ★ 4桁PIN は以前ウィザードを閉じたあとの別モーダルで聞いていたが、
     「登録し終わったのにまだ何か聞かれる」導線だったので登録の最終ステップに入れた。 */
const WZ_STEPS = ["アイコン", "表示名", "生年月日", "パスワード", "4桁の番号"];

function wzNext(step) {
  if (step === 1) {
    if (!wzSelectedChar) return;
  }
  for (let i = 0; i <= 5; i++) {
    const s = document.getElementById("wzStep" + i);
    if (s) s.classList.toggle("on", i === step);
  }
  const done = step >= WZ_STEPS.length;
  const fill = document.getElementById("wzRailFill");
  if (fill) fill.style.width = (done ? 100 : ((step + 1) / WZ_STEPS.length) * 100) + "%";
  const no = document.getElementById("wzStepNo");
  if (no) no.textContent = done ? "COMPLETE" : "STEP " + (step + 1) + " / " + WZ_STEPS.length;
  const nm = document.getElementById("wzStepNm");
  if (nm) nm.textContent = done ? "登録完了" : WZ_STEPS[step];
  const rail = document.getElementById("wzRail");
  if (rail) rail.style.opacity = done ? ".45" : "1";
  // カードの高さが変わるので、開いているシートの先頭に戻す
  const card = document.getElementById("accWizardCard");
  if (card) card.scrollTop = 0;
  if (step === 4) setTimeout(() => pinFocus("wzPinBoxes"), 120);
}

/* ── 4桁PIN：1マス1文字の入力（自動送り・貼り付け・バックスペース対応） ──
   マスを分けたのは入力中の桁が見えるようにするため。値の読み書きは必ず
   pinValue()/pinClear() を通す（1マスずつ getElementById する実装は増やさない）。 */
function pinCells(id) {
  const box = document.getElementById(id);
  return box ? Array.from(box.querySelectorAll(".pin-cell")) : [];
}
function pinValue(id) { return pinCells(id).map((c) => c.value.trim()).join(""); }
function pinClear(id) { pinCells(id).forEach((c) => { c.value = ""; c.classList.remove("filled"); }); }
function pinFocus(id) {
  const cells = pinCells(id);
  const next = cells.find((c) => !c.value) || cells[0];
  if (next) { try { next.focus(); next.select(); } catch (e) {} }
}
function pinBind(id) {
  const cells = pinCells(id);
  cells.forEach((cell, i) => {
    if (cell.dataset.bound) return;
    cell.dataset.bound = "1";
    cell.addEventListener("input", () => {
      // IME や日本語キーボードから全角数字が来ることがあるので半角に寄せる
      const v = cell.value.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
                          .replace(/\D/g, "");
      cell.value = v.slice(-1);
      cell.classList.toggle("filled", !!cell.value);
      if (cell.value && cells[i + 1]) cells[i + 1].focus();
    });
    cell.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !cell.value && cells[i - 1]) {
        e.preventDefault(); cells[i - 1].value = ""; cells[i - 1].classList.remove("filled"); cells[i - 1].focus();
      } else if (e.key === "ArrowLeft" && cells[i - 1]) { e.preventDefault(); cells[i - 1].focus(); }
      else if (e.key === "ArrowRight" && cells[i + 1]) { e.preventDefault(); cells[i + 1].focus(); }
    });
    cell.addEventListener("paste", (e) => {
      const t = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
      if (!t) return;
      e.preventDefault();
      cells.forEach((c, k) => { c.value = t[k] || ""; c.classList.toggle("filled", !!c.value); });
      pinFocus(id);
    });
    cell.addEventListener("focus", () => { try { cell.select(); } catch (e) {} });
  });
}

// 表示名ステップの「次へ」: グローバル一意チェック
/* 装飾文字（特殊フォント）検出：数学英数字記号・囲み英数字・上付き修飾文字など。
   これらは他アプリでの表示崩れ・なりすまし・検索不能の原因になるため登録を弾く。 */
function hasFancyChars(str) {
  for (const ch of String(str || "")) {
    const cp = ch.codePointAt(0);
    if (
      (cp >= 0x1D400 && cp <= 0x1D7FF) || // Mathematical Alphanumeric Symbols（𝑴𝑰𝑵𝑨 等）
      (cp >= 0x1D2C  && cp <= 0x1D6A)  || // 上付き修飾文字 ᴬᴮ
      (cp >= 0x2100  && cp <= 0x214F)  || // Letterlike Symbols ℂℊℋ
      (cp >= 0x2460  && cp <= 0x24FF)  || // 囲み英数字 ①②Ⓐ
      (cp >= 0x1F100 && cp <= 0x1F1FF)    // 囲み英数字補助・地域表示
    ) return true;
  }
  return false;
}

async function wzNameNext() {
  const name = (document.getElementById("wzName")?.value.trim()) || "";
  const msg = document.getElementById("wzNameMsg");
  if (!name) { if (msg) msg.textContent = "表示名を入力してください。"; return; }
  if (hasFancyChars(name)) {
    if (msg) { msg.style.color = "#ff6b8a"; msg.textContent = "装飾文字（特殊フォント）は使えません。ふつうの文字で入力してください。"; }
    return;
  }
  /* ★ 2026-08-03: 同名チェックを復活させた。
     旧実装は「削除済みアカウントの残骸が使用中と誤判定される」のを避けるため重複を許し、
     登録時に同名レコードを *全部消して* 名前を引き継いでいた。
     そのため「ログアウト → 同じ名前で新規登録」で、それまでのアカウントが丸ごと消えていた。
     いまは残骸（中身のないレコード）だけを掃除し、中身のあるアカウントが残っていたら
     ここで登録を止める（＝人のデータを壊さない）。 */
  if (msg) { msg.style.color = ""; msg.textContent = "確認しています…"; }
  const r = await freeUpName(name, null, null);
  if (r && r.blocked) {
    if (msg) { msg.style.color = "#ff6b8a"; msg.textContent = "この表示名はすでに使われています。別の名前にしてください。（自分のアカウントなら「ログイン」からお入りください）"; }
    return;
  }
  if (msg) { msg.style.color = ""; msg.textContent = ""; }
  wzNext(2);
}

/* 同名の「中身のない残骸レコード」を両DB（MagiLink users / XEVARION accounts）から掃除して
   名前を解放する。exceptMl/exceptXv には自分の uid を渡すと保護される。
   戻り値 { blocked:true } ＝ 中身のある同名アカウントが実在した（この名前は使えない）。 */
async function freeUpName(name, exceptMl, exceptXv) {
  if (!name) return { blocked: false };
  let blocked = false;
  try { if (window.XEVASync && window.XEVASync.deleteUserByName) await window.XEVASync.deleteUserByName(name, exceptMl); } catch (e) {}
  try {
    const FB = await waitXFB();
    if (FB && FB.deleteAccountByName) {
      const r = await FB.deleteAccountByName(name, exceptXv);
      if (r && r.blocked) blocked = true;
    }
  } catch (e) {}
  return { blocked };
}

async function wzFinish() {
  const msg = document.getElementById("wzPinMsg");
  const btn = document.getElementById("wzFinishBtn");
  const setMsg = (t) => { if (msg) msg.textContent = t || ""; };
  setMsg("");

  /* ★ 4桁PIN は登録の一部。ここで検証してから何も保存しない
       （途中で弾かれたのに setupDone だけ立つと、PINの無いアカウントが出来てしまう）。 */
  const pin = pinValue("wzPinBoxes");
  if (!/^\d{4}$/.test(pin)) { setMsg("4桁の数字を入力してください。"); pinFocus("wzPinBoxes"); return; }
  /* ★ 2026-08-11 確認用の再入力。忘れる・打ちまちがえると自分のアカウントに戻れなくなる番号なので、
     2回入れて一致したときだけ先へ進める。一致しなければ確認欄だけ空にして入れ直してもらう。 */
  const pin2 = pinValue("wzPinBoxes2");
  if (!/^\d{4}$/.test(pin2)) { setMsg("確認のため、同じ4桁をもう一度入力してください。"); pinFocus("wzPinBoxes2"); return; }
  if (pin !== pin2) {
    setMsg("2つの4桁が一致しません。もう一度入力してください。");
    pinClear("wzPinBoxes2"); pinFocus("wzPinBoxes2");
    return;
  }
  const FB = await waitXFB();
  if (!FB) { setMsg("接続を確認しています。少し待って、もう一度お試しください。"); return; }

  if (btn) { btn.disabled = true; btn.textContent = "登録しています…"; }
  const unlock = () => { if (btn) { btn.disabled = false; btn.textContent = "✓ 登録する"; } };

  const acc = getAcc() || {};
  acc.charId   = wzSelectedChar ? wzSelectedChar.id   : "hina";
  acc.charFile = wzSelectedChar ? wzSelectedChar.file : "s0/Hina.png";
  acc.name  = (document.getElementById("wzName")?.value.trim()) || "ユーザー";
  acc.bday  = document.getElementById("wzBday")?.value || "";
  const pw  = document.getElementById("wzPw")?.value || "";
  acc.pwHash = pw ? await simpleHash(pw) : null;
  acc.gamePwHash = await FB.hashPw(pin);
  acc.setupDone = true;
  saveAcc(acc);

  // 同名の残骸レコードを掃除してから MagiLink (Firebase) へアカウントを作成・紐づけ
  // （削除済みの名前が「使用中」と誤判定される問題への対応：この登録が名前を引き継ぐ）
  await freeUpName(acc.name, acc.mlUid, acc.xvUid);
  if (window.XEVASync) {
    let r = await window.XEVASync.linkAccount(acc);
    if (r && r.error === "name") {
      // まだ衝突する場合はもう一度掃除して再試行（それでも失敗したら黙って続行＝後で reconcile される）
      await freeUpName(acc.name, acc.mlUid, acc.xvUid);
      try { await window.XEVASync.linkAccount(acc); } catch (e) {}
    }
  }

  /* XEVARION（accounts）へ登録して xvUid を得る。saveGamePw と同じ方針で、
     中身のある同名アカウントは絶対に乗っ取らない。 */
  const reg = await FB.register(acc);
  if (reg && reg.uid) { acc.xvUid = reg.uid; saveAcc(acc); }
  else if (reg && reg.error === "name") {
    const u = await FB.findByName(acc.name);
    if (u && u.uid && !u.gamePwHash) { acc.xvUid = u.uid; saveAcc(acc); await FB.updateProfile(acc); }
    else {
      setMsg("この表示名はすでに使われています。「表示名」まで戻って別の名前にしてください。");
      unlock(); return;
    }
  }
  /* ★ xvUid が取れなければ登録は完了していない。ここで先へ進めると
       「PINはあるが xvUid が無い」＝クラウド同期されないアカウントが出来上がる。 */
  if (!getAcc()?.xvUid) {
    setMsg("アカウントの登録に失敗しました。通信環境を確認して、もう一度お試しください。");
    unlock(); return;
  }
  unlock();
  pinClear("wzPinBoxes");
  pinClear("wzPinBoxes2");

  // クラウドアカウント：セッション主張＋（初回なら）ローカル→クラウド移行
  try { if (window.XevaCloud) await window.XevaCloud.onAccountCreated(); } catch (e) {}
  claimGameRewards();

  // show done step
  const doneImg = document.getElementById("wzDoneImg");
  if (doneImg) doneImg.src = getCharImgPath(acc.charFile);
  const doneName = document.getElementById("wzDoneName");
  if (doneName) doneName.textContent = "ようこそ、" + acc.name + "！";
  wzNext(5);

  renderNavUser();
  // grant today's login bonus
  if (window.XEVA) {
    const granted = window.XEVA.grantLoginBonus();
    renderXevaBalance();
    renderXevaMissions();
    if (granted.amount > 0) setTimeout(() => showLoginBonusModal(granted.day, granted.amount), 400);
  }
  // show XEVA howto on first registration
  /* ★ 入手方法はジェムと同じ一覧シートに統一した（xhOpenXevaGuide）。
     旧スライドショー（openHowto）は残してあるが、通常の導線からは使わない。 */
  setTimeout(() => {
    try { localStorage.setItem(HOWTO_KEY, "1"); } catch (e) {}
    if (typeof window.xhOpenXevaGuide === "function") window.xhOpenXevaGuide();
    else openHowto(true);
  }, 800);
}

function openAccWizard() {
  wzSelectedChar = null;
  buildWzCharGrid();
  pinBind("wzPinBoxes");
  pinClear("wzPinBoxes");
  /* ★ 2026-08-11 確認用の再入力欄も同じように結線・初期化する（忘れると入力が効かない） */
  pinBind("wzPinBoxes2");
  pinClear("wzPinBoxes2");
  const pm = document.getElementById("wzPinMsg"); if (pm) pm.textContent = "";
  wzNext(0);
  document.getElementById("accWizardOv").classList.add("open");
}

function closeAccWizard() {
  document.getElementById("accWizardOv").classList.remove("open");
  // 登録直後にゲーム連携4桁パスワード（必須）を設定してもらう
  setTimeout(() => ensureGamePw(), 300);
}

/* ── XEVARION Firebase（xevarion-account）待機 ── */
function waitXFB() {
  return new Promise((res) => {
    if (window.XEVARIONFB) return res(window.XEVARIONFB);
    let done = false; const f = () => { if (!done) { done = true; res(window.XEVARIONFB || null); } };
    window.addEventListener("xevarionfb:ready", f, { once: true });
    setTimeout(f, 6000);
  });
}

/* ── ゲーム連携 4桁パスワード（必須） ── */
function openGamePwModal() {
  pinBind("gamePwBoxes");
  pinClear("gamePwBoxes");
  const msg = document.getElementById("gamePwMsg"); if (msg) msg.textContent = "";
  document.getElementById("gamePwOv").classList.add("open");
  setTimeout(() => pinFocus("gamePwBoxes"), 200);
}
function closeGamePwModal() { document.getElementById("gamePwOv").classList.remove("open"); }
async function saveGamePw() {
  const msg = document.getElementById("gamePwMsg");
  const pw = pinValue("gamePwBoxes");
  if (!/^\d{4}$/.test(pw)) { if (msg) msg.textContent = "4桁の数字を入力してください。"; pinFocus("gamePwBoxes"); return; }
  const FB = await waitXFB();
  if (!FB) { if (msg) msg.textContent = "接続を確認しています。少し待って再度お試しください。"; return; }
  const acc = getAcc() || {};
  acc.gamePwHash = await FB.hashPw(pw);
  saveAcc(acc);
  // XEVARION Firebase へ登録／更新（名前一意・アイコン・4桁PW）
  const r = await FB.register(acc);
  if (r && r.uid) { acc.xvUid = r.uid; saveAcc(acc); }
  else if (r && r.error === "name") {
    /* ★ 同名のアカウントが実在した。勝手に乗っ取らない（2026-08-03）。
       旧実装は無条件でその uid を自分のものにし、プロフィールを上書きしていたため、
       同じ名前を入力しただけで他人（＝ログアウト前の自分）のアカウントを
       つぶしてしまうことがあった。
       引き継いでよいのは「4桁PWがまだ無い＝登録が途中で終わったレコード」だけ。 */
    const u = await FB.findByName(acc.name);
    if (u && u.uid && !u.gamePwHash) { acc.xvUid = u.uid; saveAcc(acc); await FB.updateProfile(acc); }
    else {
      if (msg) msg.textContent = "この表示名はすでに使われています。アカウント設定から別の名前に変えてから、もう一度お試しください。";
      return;
    }
  }
  // ★ xvUid が取れなければ登録は完了していない。ここで閉じてしまうと
  //    「4桁PWはあるが xvUid が無い」アカウントが出来上がり、ensureGamePw も再試行しないため
  //    以後ずっとクラウド同期されない＝データが端末に取り残される。閉じずに再試行させる。
  if (!getAcc()?.xvUid) {
    if (msg) msg.textContent = "アカウントの登録に失敗しました。通信環境を確認して、もう一度お試しください。";
    return;
  }
  closeGamePwModal();
  showXevaToast(0, "ゲーム連携パスワードを設定しました");
  // クラウドアカウント：セッション主張＋（初回なら）ローカル→クラウド移行
  try { if (window.XevaCloud) await window.XevaCloud.onAccountCreated(); } catch (e) {}
  claimGameRewards();
}
// アカウント設定からゲーム連携4桁パスワードを変更（設定済みなら現在の4桁で本人確認）
async function changeGamePw() {
  const msg = document.getElementById("setGamePwMsg");
  const setMsg = (t, ok) => { if (msg) { msg.textContent = t || ""; msg.classList.toggle("ok", !!ok); } };
  setMsg("");
  const FB = await waitXFB();
  if (!FB) { setMsg("接続を確認しています。少し待って再度お試しください。"); return; }
  const acc = getAcc() || {};
  if (acc.gamePwHash) {
    const cur = pinValue("setGamePwCurBoxes");
    if (!/^\d{4}$/.test(cur)) { setMsg("現在の4桁を入力してください。"); pinFocus("setGamePwCurBoxes"); return; }
    if (await FB.hashPw(cur) !== acc.gamePwHash) { setMsg("現在の4桁が違います。"); return; }
  }
  const pw = pinValue("setGamePwBoxes");
  if (!/^\d{4}$/.test(pw)) { setMsg("新しい4桁の数字を入力してください。"); pinFocus("setGamePwBoxes"); return; }
  acc.gamePwHash = await FB.hashPw(pw);
  saveAcc(acc);
  // XEVARION Firebase（accounts）へ反映（xvUid があれば更新、無ければ登録して取得）
  await syncXFBProfile(acc);
  pinClear("setGamePwCurBoxes");
  pinClear("setGamePwBoxes");
  refreshAccPwUI();
  setMsg("4桁の番号を変更しました。", true);
  showXevaToast(0, "ゲーム連携パスワードを変更しました");
}

// XEVARION Firebase（accounts＝ゲーム内紐づけDB）へプロフィール（表示名・アイコン・4桁PW）を反映。
//   xvUid があれば更新、無ければ登録して取得。名前重複時は既存の自分を採用して更新。
//   ※ これを怠ると GameLink.findByName が初期設定時の名前のまま残り、
//     名前・アイコン変更後に MagiChainParty 等でゲーム内紐づけができなくなる。
async function syncXFBProfile(acc) {
  acc = acc || getAcc();
  if (!acc || !acc.name) return;
  const FB = await waitXFB(); if (!FB) return;
  if (acc.xvUid) {
    await FB.updateProfile(acc);
  } else {
    const r = await FB.register(acc);
    if (r && r.uid) { acc.xvUid = r.uid; saveAcc(acc); }
    else if (r && r.error === "name") {
      /* ★ 中身のある同名アカウントは乗っ取らない（saveGamePw と同じ方針） */
      const u = await FB.findByName(acc.name);
      if (u && u.uid && !u.gamePwHash) { acc.xvUid = u.uid; saveAcc(acc); await FB.updateProfile(acc); }
    }
  }
}

/* 4桁パスワード未設定なら必須モーダルを開く（既存ユーザーにも強制）。
   ★ xvUid が無い場合も対象。xvUid はクラウド同期の紐づけキーなので、
     これが欠けたアカウントはセーブが端末から出られない（＝機種変で引き継げない）。
     まずは通信できているうちに自動で復旧を試み、それも駄目な時だけ再入力を求める。 */
async function ensureGamePw() {
  const acc = getAcc();
  if (!acc || !acc.setupDone) return false;
  if (!acc.gamePwHash) { openGamePwModal(); return true; }
  if (!acc.xvUid) {
    await reconcileXvUid();
    if (!getAcc()?.xvUid) { openGamePwModal(); return true; }
  }
  return false;
}

/* 登録が途中で失敗して xvUid を持たないアカウントを、通信できたタイミングで自動復旧する。
   ・同名の既存アカウントがあればそれを採用（別人を新規作成しない）
   ・無ければ 4桁PW ごと登録し直す
   復旧できたらローカルのセーブ一式をクラウドへ初回移行する。 */
let _xvReconciling = null;
async function reconcileXvUid() {
  const acc = getAcc();
  if (!acc || !acc.setupDone || acc.xvUid || !acc.gamePwHash) return getAcc();
  if (_xvReconciling) { try { await _xvReconciling; } catch (e) {} return getAcc(); }
  _xvReconciling = (async () => {
    const FB = await waitXFB(); if (!FB) return;
    const cur = getAcc(); if (!cur || cur.xvUid) return;
    // 同名の既存アカウント＝自分の可能性が高い。4桁PWが一致すればそれを引き継ぐ。
    try {
      const hit = await FB.findByName(cur.name);
      if (hit && hit.uid) {
        if (hit.gamePwHash && hit.gamePwHash === cur.gamePwHash) {
          cur.xvUid = hit.uid; saveAcc(cur); await FB.updateProfile(cur);
        }
        return;   // 同名だがPW違い＝別人。勝手に乗っ取らず、モーダルで本人に判断させる。
      }
    } catch (e) { return; }
    const r = await FB.register(cur);
    if (r && r.uid) { const a = getAcc() || cur; a.xvUid = r.uid; saveAcc(a); }
  })();
  try { await _xvReconciling; } catch (e) {} finally { _xvReconciling = null; }
  // 復旧できたらローカル→クラウドの初回移行を走らせる
  if (getAcc()?.xvUid) { try { if (window.XevaCloud) await window.XevaCloud.onAccountCreated(); } catch (e) {} }
  return getAcc();
}
window.reconcileXvUid = reconcileXvUid;
// ゲーム賞金 XEVA（pending）＋ 前月のMagiRanking賞金をポータル起動時に受け取る
async function claimGameRewards() {
  const acc = getAcc();
  if (!acc || !acc.xvUid) return;
  const FB = await waitXFB(); if (!FB) return;
  // 最終ログイン時刻を記録（アカウント一覧に表示）
  try { if (FB.touchLastLogin) FB.touchLastLogin(acc.xvUid); } catch (e) {}
  // 前月のランキング賞金を pending に積む（月替わり後の初回のみ）
  try { if (FB.claimRankReward) await FB.claimRankReward(acc.xvUid); } catch (e) {}
  const r = await FB.claimPending(acc.xvUid);
  if (r && r.total > 0) {
    if (window.XEVA) window.XEVA.add(r.total, "ゲーム賞金 XEVA");
    try { renderXevaBalance(); } catch (e) {}
    showXevaToast(r.total, "ゲーム賞金・ランキング賞金を受け取りました！");
  }
}

/* ── account settings ── */
function openAccSettings() {
  const acc = getAcc();
  const img = document.getElementById("setAvImg");
  if (img) {
    img.src = acc && acc.charFile ? getCharImgPath(acc.charFile) : "";
    img.style.display = acc && acc.charFile ? "block" : "none";
  }
  const nameInp = document.getElementById("setNameInp");
  if (nameInp) nameInp.value = acc?.name || "";
  const bdayInp = document.getElementById("setBdayInp");
  if (bdayInp) bdayInp.value = acc?.bday || "";
  // パスワード系は開くたびに空に戻す（前回の入力を残さない）
  ["setPwCur", "setPwInp"].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ""; });
  ["setPwMsg", "setGamePwMsg"].forEach((id) => {
    const el = document.getElementById(id); if (el) { el.textContent = ""; el.classList.remove("ok"); }
  });
  ["setGamePwCurBoxes", "setGamePwBoxes"].forEach((id) => { pinBind(id); pinClear(id); });
  refreshAccPwUI();
  renderShowcaseSlots();
  document.getElementById("accSettingsOv").classList.add("open");
}
function closeAccSettings() {
  const ov = document.getElementById("accSettingsOv");
  if (ov) ov.classList.remove("open");
}

async function saveAccName() {
  const v = document.getElementById("setNameInp")?.value.trim();
  if (!v) return;
  if (hasFancyChars(v)) { showXevaToast(0, "装飾文字（特殊フォント）は使えません"); return; }
  const acc = getAcc() || {};
  /* 同名の残骸レコード（登録に失敗した抜け殻など）は掃除するが、
     中身のあるアカウントが同じ名前を使っていたら改名しない（人のデータを壊さない）。 */
  const fr = await freeUpName(v, acc.mlUid, acc.xvUid);
  if (fr && fr.blocked) { showXevaToast(0, "「" + v + "」はすでに使われています。別の名前にしてください"); return; }
  const oldName = acc.name;
  acc.name = v; saveAcc(acc);
  renderNavUser();
  if (window.XEVASync) await window.XEVASync.syncProfile(acc);  // MagiLink（users）へ同期
  await syncXFBProfile(acc);                                    // XEVARION（accounts＝ゲーム内紐づけ）へ同期
  // 旧名を解放：改名後も旧名を持つ残骸レコード（自分の重複/orphan）を消す。
  //   自分の現行レコードは除外（exceptUid）。表示名は一意なので旧名の残りは同一人物の残骸。
  if (oldName && oldName !== v) {
    const cur = getAcc() || acc;   // 同期で採番された最新の xvUid/mlUid を使う
    try { const FB = await waitXFB(); if (FB && FB.deleteAccountByName) await FB.deleteAccountByName(oldName, cur.xvUid); } catch (e) {}
    try { if (window.XEVASync && window.XEVASync.deleteUserByName) await window.XEVASync.deleteUserByName(oldName, cur.mlUid); } catch (e) {}
  }
  showXevaToast(0, "表示名を「" + v + "」に変更しました");
}
function saveAccBday() {
  const v = document.getElementById("setBdayInp")?.value || "";
  const acc = getAcc() || {};
  acc.bday = v; saveAcc(acc);
  if (window.XEVASync) window.XEVASync.syncProfile(acc);   // MagiLink へ同期
  showXevaToast(0, "生年月日を更新しました");
}
/* ★ パスワード系の再設定は、まず「現在のパスワード」で本人確認してから新しい値を保存する。
     旧実装は現在の値を聞かずに上書きしていたため、ロック解除後に端末を触れた人が
     そのままパスワードを書き換えて締め出せてしまった。
     まだ設定していない人には現在欄を出さない（openAccSettings 側で hidden を切り替え）。 */
async function saveAccPw() {
  const msg = document.getElementById("setPwMsg");
  const setMsg = (t, ok) => { if (msg) { msg.textContent = t || ""; msg.classList.toggle("ok", !!ok); } };
  setMsg("");
  const acc = getAcc() || {};
  const curInp = document.getElementById("setPwCur");
  if (acc.pwHash) {
    const cur = curInp?.value || "";
    if (!cur) { setMsg("現在のパスワードを入力してください。"); return; }
    if (await simpleHash(cur) !== acc.pwHash) { setMsg("現在のパスワードが違います。"); return; }
  }
  const pw = document.getElementById("setPwInp")?.value || "";
  acc.pwHash = pw ? await simpleHash(pw) : null;
  saveAcc(acc);
  if (curInp) curInp.value = "";
  document.getElementById("setPwInp").value = "";
  refreshAccPwUI();
  setMsg(pw ? "パスワードを更新しました。" : "パスワードを削除しました。", true);
  showXevaToast(0, pw ? "パスワードを設定しました" : "パスワードを削除しました");
}

/* 現在欄の出し分け（未設定なら聞くものが無いので隠す） */
function refreshAccPwUI() {
  const acc = getAcc() || {};
  const pwWrap = document.getElementById("setPwCurWrap");
  if (pwWrap) pwWrap.hidden = !acc.pwHash;
  const gpWrap = document.getElementById("setGamePwCurWrap");
  if (gpWrap) gpWrap.hidden = !acc.gamePwHash;
}
async function deleteAccount() {
  if (!confirm("アカウントを削除しますか？\nアカウント一覧・MagiRanking・MagiLink からも削除されます。\n⚠ このアカウントの XEVA・キャラクター（ガチャ）・各ゲームのデータはすべてリセットされ、元に戻せません。")) return;
  const acc = getAcc() || {};
  // XEVARION（アカウント一覧＝accounts）から削除。
  //   uid で消したうえで、表示名でも一掃する（uid が失われた orphan/重複を残さず、名前を再利用可能にする）。
  try {
    const FB = await waitXFB();
    if (FB) {
      if (FB.deleteAccount && acc.xvUid) await FB.deleteAccount(acc.xvUid);
      if (FB.deleteAccountByName && acc.name) await FB.deleteAccountByName(acc.name);
    }
  } catch (e) {}
  // MagiLink から削除（同期）。uid・表示名の両方で一掃して名前を解放する。
  try {
    if (window.XEVASync) {
      if (acc.mlUid) await window.XEVASync.deleteUser(acc.mlUid);
      if (acc.name) await window.XEVASync.deleteUserByName(acc.name);
    }
  } catch (e) {}
  /* 端末ごとの紐づけは廃止したため、削除時は XEVA・キャラ・各ゲームのローカルデータもリセット
     （クラウド側は accounts/{uid} 削除で store ごと消える）。
     ★ 2026-08-05: ログアウトと同じ「台帳に載っているキーだけ消す」やり方をやめ、
       削除では purgeLocalAccount（＝端末そのものの設定いがいを全部消す）を使う。
       台帳への載せ忘れが1つでもあると、消したはずの XEVA やゲームのセーブが端末に残り、
       次に作ったアカウントへそのまま引き継がれてしまうため。
       sessionStorage も purgeLocalAccount の中で丸ごと空にしている。 */
  if (window.XEVA) window.XEVA.account.delete();
  if (window.XevaCloud && window.XevaCloud.purgeLocalAccount) {
    window.XevaCloud.purgeLocalAccount();
  } else if (window.XevaCloud && window.XevaCloud.wipeLocalAccount) {
    window.XevaCloud.wipeLocalAccount(false);   // 旧版へのフォールバック
  }
  try { localStorage.removeItem("xeva_session_v1"); } catch (e) {}
  try { window.dispatchEvent(new Event("xeva:change")); } catch (e) {}   // 残高表示を0に更新
  try { sessionStorage.clear(); } catch (e) {}
  closeAccSettings();
  renderNavUser();
  /* ★ 画面には削除前の残高・キャラがまだ描かれているので、必ず読み直してから
     サインイン画面に入る（描画だけ古いまま残るのを防ぐ）。 */
  setTimeout(() => { try { location.reload(); } catch (e) { showXevaHome(); } }, 200);
}

/* ── char picker for settings ── */
let setSelectedChar = null;

function openCharPickForSettings() {
  const chars = window.XEVA ? window.XEVA.CHARS : [];
  const grid = document.getElementById("setCharGrid");
  if (!grid) return;
  const acc = getAcc();
  /* ★ 2026-08-10 アイコンは<b>アプリに関係なく全キャラ</b>から選べる。
     以前は「そのアプリで持っているキャラだけ」だったので、
     遊びはじめの人はほとんど選べなかった。アイコンは見た目だけのものなので所持で絞らない。
     ★ 2026-08-12 CDK限定キャラ（アヤカ）も含めて<b>本当に全員</b>から選べるようにした。 */
  const allChars = chars.slice();
  const mbChars = mbIconChars();
  setSelectedChar = null;
  const saveBtn = document.getElementById("setCharSaveBtn");
  if (saveBtn) saveBtn.disabled = true;
  const sec = (t, s) => `<div class="char-pick-sec">${t}<small>${s}</small></div>`;
  grid.innerHTML =
    (allChars.length ? sec("🎰 XEVAガチャ", allChars.length + "体・所持していなくても選べます")
      + allChars.map((c) => charPickItemHTML(c, acc && acc.charId === c.id, "scci_", "setPickChar")).join("") : "")
    + (mbChars.length ? sec("⚔ MagiBurst", mbChars.length + "体・所持していなくても選べます")
      + mbChars.map((c) => charPickItemHTML(c, acc && acc.charId === c.id, "scci_", "setPickChar")).join("") : "");
  document.getElementById("accCharPickOv").classList.add("open");
}

function setPickChar(id, file, name) {
  setSelectedChar = { id, file, name };
  document.querySelectorAll("#setCharGrid .char-pick-item").forEach((el) => el.classList.remove("sel"));
  const el = document.getElementById("scci_" + id);
  if (el) el.classList.add("sel");
  const saveBtn = document.getElementById("setCharSaveBtn");
  if (saveBtn) saveBtn.disabled = false;
}

function closeCharPickForSettings() {
  const ov = document.getElementById("accCharPickOv");
  if (ov) ov.classList.remove("open");
}

function saveAccChar() {
  if (!setSelectedChar) return;
  const acc = getAcc() || {};
  acc.charId   = setSelectedChar.id;
  acc.charFile = setSelectedChar.file;
  saveAcc(acc);
  if (window.XEVASync) window.XEVASync.syncProfile(acc);   // MagiLink（users）へアイコン同期
  syncXFBProfile(acc);                                     // XEVARION（accounts＝ゲーム内紐づけ）へアイコン同期
  const img = document.getElementById("setAvImg");
  if (img) img.src = getCharImgPath(acc.charFile);
  closeCharPickForSettings();
  renderNavUser();
  showXevaToast(0, "アイコンを「" + setSelectedChar.name + "」に変更しました");
}

/* ── キャラ・ショーケース（推し最大3体, MagiLinkプロフィールに表示）── */
function showcaseList(){ const acc=getAcc()||{}; return Array.isArray(acc.showcase)?acc.showcase:[]; }
function renderShowcaseSlots(){
  const box=document.getElementById("showcaseSlots"); if(!box) return;
  const chars=window.XEVA?window.XEVA.CHARS:[]; const ids=showcaseList();
  let html="";
  for(let i=0;i<5;i++){
    const id=ids[i]; const ch=id&&chars.find(c=>c.id===id);
    html += ch
      ? `<div style="width:52px;height:52px;border-radius:14px;overflow:hidden;border:2px solid #8e6bff;box-shadow:0 4px 12px rgba(142,107,255,.3)"><img src="${getCharImgPath(ch.file)}" alt="${ch.name}" style="width:100%;height:100%;object-fit:cover"></div>`
      : `<div style="width:52px;height:52px;border-radius:14px;border:2px dashed rgba(56,140,220,.35);display:grid;place-items:center;color:rgba(34,52,77,.45);font-size:22px">＋</div>`;
  }
  box.innerHTML=html;
}
let showcasePick=[];
function openShowcasePick(){
  const chars=window.XEVA?window.XEVA.CHARS:[];
  let owned={}; try{ const g=JSON.parse(localStorage.getItem("xeva_gacha_v1")||"{}"); owned=g.owned||{}; }catch(e){}
  const ownedChars=chars.filter(c=>c.id==="hina"||owned[c.id]);
  showcasePick=showcaseList().slice(0,5);
  const grid=document.getElementById("showcaseGrid");
  if(grid){
    grid.innerHTML=ownedChars.map(c=>`<div class="char-pick-item${showcasePick.includes(c.id)?' sel':''}" id="shc_${c.id}" onclick="toggleShowcase('${c.id}')">
      <img src="${getCharImgPath(c.file)}" alt="${c.name}" loading="lazy"><div class="char-pick-nm">${c.name}</div></div>`).join("");
  }
  updateShowcaseHint();
  document.getElementById("showcasePickOv").classList.add("open");
}
function updateShowcaseHint(){ const h=document.getElementById("showcaseHint"); if(h) h.textContent="所持キャラから最大5体（"+showcasePick.length+"/5 選択中）"; }
function toggleShowcase(id){
  const i=showcasePick.indexOf(id);
  if(i>=0) showcasePick.splice(i,1);
  else { if(showcasePick.length>=5){ showXevaToast(0,"ショーケースは最大5体までです"); return; } showcasePick.push(id); }
  const el=document.getElementById("shc_"+id); if(el) el.classList.toggle("sel", showcasePick.includes(id));
  updateShowcaseHint();
}
function closeShowcasePick(){ const ov=document.getElementById("showcasePickOv"); if(ov) ov.classList.remove("open"); }
function saveShowcase(){
  const acc=getAcc()||{}; acc.showcase=showcasePick.slice(0,5); saveAcc(acc);
  if(window.XEVASync) window.XEVASync.syncProfile(acc);   // MagiLink へ同期
  renderShowcaseSlots(); closeShowcasePick();
  try{ if(typeof xhRenderStage==="function") xhRenderStage(true); }catch(e){}
  showXevaToast(0,"ショーケースを更新しました");
}

/* ── password lock ── */
async function tryUnlock() {
  const acc = getAcc();
  if (!acc?.pwHash) { unlockAndContinue(); return; }
  const val = document.getElementById("lockInput")?.value || "";
  const hash = await simpleHash(val);
  if (hash === acc.pwHash) {
    unlockAndContinue();
  } else {
    const msg = document.getElementById("lockMsg");
    if (msg) { msg.textContent = "パスワードが違います"; setTimeout(() => { msg.textContent = ""; }, 2000); }
  }
}
function unlockAndContinue() {
  sessionStorage.setItem(SS_UNLOCKED, "1");
  const lock = document.getElementById("accLock");
  if (lock) lock.classList.remove("open");
  seedMails(); updateMailBadge();
  runPortalBoot();   // 通常のポータル起動（ログインボーナス・ミッション・ゲーム賞金など）
}
function granted_safe(){ return window.XEVA && window.XEVA.hasLoginBonus && window.XEVA.hasLoginBonus() ? 3400 : 1400; }

/* ── 誕生日イベント（年1回・誕生日当日ログインで特典）── */
const BDAY_REWARD = 700;
function checkBirthday(){
  const acc = getAcc(); if (!acc || !acc.bday) return;
  const mmdd = String(acc.bday).slice(5);                 // "MM-DD"
  const now = new Date();
  const todayMD = String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");
  if (mmdd !== todayMD) return;
  const year = now.getFullYear();
  let claimed={}; try{ claimed=JSON.parse(localStorage.getItem("xeva_bday_v1")||"{}"); }catch(e){}
  if (claimed[year]) return;
  claimed[year]=Date.now(); try{ localStorage.setItem("xeva_bday_v1", JSON.stringify(claimed)); }catch(e){}
  // 誕生日特典メール
  const data = loadMails();
  data.items.unshift({ id:"bday_"+year, icon:"🎂", title:"🎉 お誕生日おめでとうございます！", date: now.toISOString().slice(0,10),
    body:(acc.name||"あなた")+" さん、お誕生日おめでとうございます！🎂\nXEVARION より、お祝いに "+BDAY_REWARD+" XEVA をお贈りします。\nこれからも素敵な一年になりますように。", amount:BDAY_REWARD, claimed:false });
  saveMails(data); updateMailBadge();
  showBirthdayModal(acc.name);
}
function showBirthdayModal(name){
  let ov=document.getElementById("bdayOv");
  if(!ov){
    ov=document.createElement("div"); ov.id="bdayOv";
    ov.style.cssText="position:fixed;inset:0;z-index:4200;background:rgba(10,8,24,.9);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px";
    ov.innerHTML=`<div style="max-width:360px;width:100%;background:linear-gradient(160deg,#2a1850,#3a1a4a);border:1px solid rgba(255,224,138,.4);border-radius:24px;padding:30px 24px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.6)">
      <div style="font-size:54px">🎂</div>
      <div style="font-family:'Orbitron',sans-serif;font-size:1.35rem;font-weight:800;color:#ffe08a;margin:8px 0 4px;letter-spacing:.04em">Happy Birthday!</div>
      <div id="bdayName" style="font-size:.95rem;color:#e8e4f5;font-weight:700"></div>
      <div style="font-size:.82rem;color:#b9bedd;line-height:1.7;margin:12px 0 18px">お誕生日おめでとうございます！<br>メールボックスに誕生日特典 <b style="color:#ffe08a">+${BDAY_REWARD} XEVA</b> が届いています 🎁</div>
      <button id="bdayBtn" style="width:100%;padding:13px;border:none;border-radius:13px;background:linear-gradient(135deg,#ffd86a,#e0a82e);color:#3a2600;font-weight:800;cursor:pointer;font-family:'Noto Sans JP',sans-serif">メールを確認する</button>
    </div>`;
    document.body.appendChild(ov);
  }
  ov.style.display="flex";
  const n=document.getElementById("bdayName"); if(n) n.textContent=(name||"")+" さん";
  const btn=document.getElementById("bdayBtn"); if(btn) btn.onclick=()=>{ ov.style.display="none"; if(typeof openMail==="function") openMail(); };
}

document.getElementById("lockInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryUnlock();
});

/* ── charFile path migration ──
   キャラをフォルダ移動した後も accounts/{uid}/charFile に古いパスが残っていると
   アイコンが 404 になる（例: "s5/Mion.png" → 現在は "bs1/Mion.png"、"s7/Kokona.png" → "bs2/Kokona.png"）。
   XEVA.canonCharFile で現行パスに直し、ローカルだけでなくクラウドにも書き戻す。
   クラウドを直さないと、ランキング・フレンド一覧・MagiLink など
   「他人から見た自分のアイコン」が壊れたままになる。 */
function migrateCharFile() {
  const acc = getAcc();
  if (!acc) return;
  const canon = (window.XEVA && window.XEVA.canonCharFile)
    ? window.XEVA.canonCharFile(acc.charFile, acc.charId)
    : acc.charFile;
  if (!canon || canon === acc.charFile) return;
  acc.charFile = canon;
  saveAcc(acc);
  // クラウド側の古いパスも直す（他の画面から見えるのはこちら）
  if (acc.xvUid) {
    waitXFB().then((fb) => {
      if (fb && fb.updateProfile) fb.updateProfile({ xvUid: acc.xvUid, charFile: canon });
    }).catch(() => {});
  }
}

/* ── XEVA入手方法 howto ── */
const HOWTO_KEY = "xeva_howto_v2";

const HOWTO_SLIDES = [
  {
    title: "毎日ログインボーナス",
    sub: "XEVARIONを開くだけで毎日 +50 XEVA 獲得",
    color: "#ffe08a",
    screen: `
      <div style="background:#1a1a2e;border-radius:14px;overflow:hidden;border:1px solid #2a2a4a">
        <div style="background:#12122a;padding:8px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #2a2a4a">
          <img src="thumbs/Xevarion.png" style="width:16px;height:16px;border-radius:4px" alt="">
          <span style="font-size:10px;color:#6b6b9a;font-family:'Orbitron',sans-serif;letter-spacing:1px">XEVARION</span>
        </div>
        <div style="padding:12px;position:relative;min-height:80px">
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <div style="width:60px;height:8px;background:rgba(255,255,255,.08);border-radius:4px"></div>
            <div style="width:40px;height:8px;background:rgba(255,255,255,.06);border-radius:4px"></div>
          </div>
          <div style="display:flex;gap:6px;margin-bottom:6px">
            <div style="flex:1;height:28px;background:rgba(255,255,255,.05);border-radius:6px"></div>
            <div style="flex:1;height:28px;background:rgba(255,255,255,.05);border-radius:6px"></div>
          </div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:8px;background:#15152a;border:1px solid rgba(240,192,64,.45);border-radius:10px;padding:8px 12px;animation:howtoFadeIn .6s ease both .3s;opacity:0">
            <img src="thumbs/XEVA.png" style="width:26px;height:26px" alt="">
            <div>
              <div style="font-family:'Orbitron',sans-serif;font-size:12px;font-weight:700;color:#ffe08a">＋50 XEVA</div>
              <div style="font-size:10px;color:#9aa0c0">毎日ログインボーナス！</div>
            </div>
          </div>
        </div>
      </div>`
  },
  {
    title: "ミッションをクリア",
    sub: "各アプリを使ってミッションを達成 +150 XEVA／件（例）",
    color: "#37e0a0",
    screen: `
      <div style="background:#1a1a2e;border-radius:14px;overflow:hidden;border:1px solid #2a2a4a">
        <div style="background:#12122a;padding:7px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #2a2a4a">
          <span style="font-size:10px">🎯</span>
          <span style="font-size:10px;color:#6b6b9a;font-weight:700">ミッション一覧（例）</span>
          <span style="margin-left:auto;font-size:9px;color:#ffe08a;font-family:'Orbitron',sans-serif">各 +150 XEVA</span>
        </div>
        <div style="padding:8px;display:flex;flex-direction:column;gap:4px">
          ${[
            ["thumbs/MagiChainParty.jpg","MagiChainPartyでゲームにチャレンジ"],
            ["thumbs/MagiLink.jpg","MagiLinkに登録しよう"],
            ["thumbs/MagiLex.jpg","MagiLexで問題にチャレンジしよう"]
          ].map(([img,txt]) => `
            <div style="display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:6px 10px">
              <img src="${img}" style="width:18px;height:18px;border-radius:5px;object-fit:cover" alt="">
              <div style="flex:1;font-size:9px;color:#d0d4f0">${txt}</div>
              <div style="font-size:9px;font-weight:700;color:#ffe08a">+150</div>
            </div>`).join("")}
          <div style="text-align:center;font-size:9px;color:#4a4a6a;padding:2px 0">… 他のアプリでも達成できます</div>
        </div>
      </div>`
  },
  {
    title: "MagiLex で問題に挑戦",
    sub: "クイズ学習でXEVAを獲得！登録・デイリーで毎日、習得やテストで大きく稼げます",
    color: "#60d0ff",
    screen: `
      <div style="background:#1a1a2e;border-radius:14px;overflow:hidden;border:1px solid #2a2a4a">
        <div style="background:#12122a;padding:7px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #2a2a4a">
          <img src="thumbs/MagiLex.jpg" style="width:14px;height:14px;border-radius:4px" alt="">
          <span style="font-size:10px;color:#6b6b9a;font-weight:700">MagiLex</span>
          <span style="margin-left:auto;font-size:9px;color:#60d0ff;font-weight:700">QUIZ APP</span>
        </div>
        <div style="padding:9px;display:flex;flex-direction:column;gap:5px">
          ${[
            ["📝","初回登録","登録するだけで","+50"],
            ["📅","デイリー学習","毎日プレイで","+50"],
            ["🏆","セクション完全習得","全問マスターで","+600"],
            ["🎯","ミックステスト","90%以上で+50／100%なら","+150"]
          ].map(([emoji,label,desc,pt])=>`
            <div style="display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.22);border:1px solid rgba(96,208,255,.15);border-radius:9px;padding:7px 11px">
              <div style="flex:none;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:15px;background:rgba(96,208,255,.12);border-radius:8px">${emoji}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:11px;font-weight:700;color:#eaf2ff;line-height:1.35">${label}</div>
                <div style="font-size:9px;color:#9aa0c0;line-height:1.3">${desc}</div>
              </div>
              <div style="flex:none;font-size:13px;font-weight:800;color:#ffe08a;font-family:'Orbitron',sans-serif">${pt}</div>
            </div>`).join("")}
        </div>
      </div>`
  },
  {
    title: "XEVAでガチャを回す",
    sub: "貯めたXEVAで左下のガチャボタンからキャラをゲット",
    color: "#b18cff",
    screen: `
      <div style="background:#1a1a2e;border-radius:14px;overflow:hidden;border:1px solid #2a2a4a">
        <div style="background:#12122a;padding:8px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #2a2a4a">
          <span style="font-size:10px">🎰</span>
          <span style="font-size:10px;color:#6b6b9a;font-weight:700">XEVA ガチャ</span>
          <div style="margin-left:auto;display:flex;align-items:center;gap:4px;background:rgba(240,192,64,.12);border:1px solid rgba(240,192,64,.3);border-radius:8px;padding:3px 8px">
            <img src="thumbs/XEVA.png" style="width:12px;height:12px" alt="">
            <span style="font-size:10px;font-weight:700;color:#ffe08a;font-family:'Orbitron',sans-serif">3,000</span>
          </div>
        </div>
        <div style="padding:10px">
          <div style="background:linear-gradient(135deg,#3a1a6a,#1a2a5a);border-radius:10px;padding:8px;margin-bottom:8px;text-align:center">
            <div style="font-size:9px;color:#b18cff;font-weight:700;margin-bottom:4px">★ Season 1 Banner</div>
            <div style="height:36px;background:linear-gradient(135deg,rgba(177,140,255,.2),rgba(124,58,237,.3));border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px">✨</div>
          </div>
          <div style="display:flex;gap:6px">
            <div style="flex:1;padding:7px;background:rgba(124,58,237,.15);border:1.5px solid rgba(124,58,237,.4);border-radius:8px;text-align:center;font-size:9px;color:#e0d0ff;font-weight:700">
              <div style="font-size:14px">🎰</div>1回 1,500
            </div>
            <div style="flex:1;padding:7px;background:rgba(240,192,64,.15);border:1.5px solid rgba(240,192,64,.4);border-radius:8px;text-align:center;font-size:9px;color:#ffe08a;font-weight:700">
              <div style="font-size:14px">🎰🎰</div>10回 13,500
            </div>
          </div>
        </div>
      </div>`
  }
];

let howtoSlide = 0;

function openHowto(force) {
  if (!force && localStorage.getItem(HOWTO_KEY) === "1") return;
  howtoSlide = 0;
  renderHowtoSlide();
  const ov = document.getElementById("howtoOv");
  if (ov) ov.style.display = "flex";
}

function closeHowto() {
  localStorage.setItem(HOWTO_KEY, "1");
  const ov = document.getElementById("howtoOv");
  if (ov) ov.style.display = "none";
}

function renderHowtoSlide() {
  const s = HOWTO_SLIDES[howtoSlide];
  const el = document.getElementById("howtoScreen");
  const title = document.getElementById("howtoTitle");
  const sub = document.getElementById("howtoSub");
  const dots = document.getElementById("howtoDots");
  const nextBtn = document.getElementById("howtoNextBtn");
  if (!s || !el) return;
  el.innerHTML = s.screen;
  if (title) { title.textContent = s.title; title.style.color = s.color; }
  if (sub) sub.textContent = s.sub;
  if (dots) dots.innerHTML = HOWTO_SLIDES.map((_, i) =>
    `<span style="width:${i===howtoSlide?20:7}px;height:7px;border-radius:4px;background:${i===howtoSlide?s.color:'rgba(56,140,220,.25)'};transition:all .3s;display:inline-block"></span>`
  ).join("");
  if (nextBtn) {
    nextBtn.textContent = howtoSlide < HOWTO_SLIDES.length - 1 ? "次へ →" : "はじめよう ✨";
    nextBtn.style.background = `linear-gradient(135deg, ${s.color}, ${s.color}88)`;
  }
}

function howtoNext() {
  if (howtoSlide < HOWTO_SLIDES.length - 1) {
    howtoSlide++;
    renderHowtoSlide();
  } else {
    closeHowto();
  }
}

/* ── メールボックス ── */
const MAIL_KEY = "xeva_mail_v1";

/* ══════════════════════════════════════════════════════════
   MagiBurst 向けプレゼントの受け渡し（2026-07-30〜）
   ・MagiBurst のメールボックスは廃止し、配布はすべてこの XEVARION メールに集約した。
   ・ただし「🎫フェスチケット」「ゴールド」「アイテム」は MagiBurst のセーブ(DB)の中にしか
     置き場所がないので、ここで直接は足せない。
     → 受け取りボタンを押した時点で “引換券” をキューに積み、MagiBurst 起動時に精算する。
   ・💎ジェムは XEVARION 共通ウォレット(xeva_gem_v1)なので、ここで即座に付与する。
   ・キューは xeva-cloud.js の SYNC_KEYS に入れて全端末で共有する（受け取りは1回だけ）。
   ══════════════════════════════════════════════════════════ */
const MBGIFT_KEY = "xeva_mbgift_v1";
function loadMbGift() {
  try { const r = localStorage.getItem(MBGIFT_KEY); if (r) { const p = JSON.parse(r); if (p && typeof p === "object") { if (!Array.isArray(p.q)) p.q = []; if (!p.done) p.done = {}; return p; } } } catch (e) {}
  return { q: [], done: {} };
}
function saveMbGift(d) { try { localStorage.setItem(MBGIFT_KEY, JSON.stringify(d)); } catch (e) {} }
/* MagiBurst 側で既に受け取り済みか（旧メールボックスで受け取った人を二重配布から守る） */
function mbAlreadyGot(srcId) {
  if (!srcId) return false;
  try {
    const raw = localStorage.getItem("magiburst_v1");
    if (!raw) return false;
    const db = JSON.parse(raw);
    return !!(db && db.mailGot && db.mailGot[srcId]);
  } catch (e) { return false; }
}
/* MagiBurst 用の引換券を積む。同じ id は一度きり。 */
function pushMbGift(srcId, mb) {
  if (!srcId || !mb) return;
  const d = loadMbGift();
  if (d.done[srcId] || d.q.some((x) => x.id === srcId)) return;
  d.q.push(Object.assign({ id: srcId, at: Date.now() }, mb));
  saveMbGift(d);
}
/* 📧メール以外（ジェムショップのフェスチケット付きパックなど）からも積めるように公開する */
window.pushMbGift = pushMbGift;

const INITIAL_MAILS = [
  /* ── 2026-08-12 大型アップデート記念（🎫フェスチケット70枚） ──
     ★ 🎫は MagiBurst のセーブ（magiburst_v1.fesTicket）にしか置き場所がないので、
       ここでは直接足せない。受け取りボタンで引換券（xeva_mbgift_v1）に積み、
       次に MagiBurst を開いたときに drainMbGifts が精算する。
     ★ チケットは<b>どのフェスでも共通</b>（蒼夏祭でもそのまま使える）。 */
  { id:"mail_update_260812", icon:"🎫", title:"大型アップデート記念 配布（🎫フェスチケット70枚）", date:"2026-08-12",
    body:"いつも XEVARION をご利用いただきありがとうございます。\n\n今回の大型アップデートでは、次の点を改善しました。\n\n・MagiBurst の「蒼夏祭」に、闇属性・反射の新★5「セイラ」が加わりました。史上最高火力の40発乱打フルバーストと、新リンク「ブレイドオービット」「ピアスシーカー20」を持ちます。\n・引いたキャラクターが「持っていない」ことになってしまう不具合を修正し、入手状況と限界突破をすべての端末で確実に同期するようにしました。\n・ガチャに効果音が付きました。\n・幽冥の庭園のクリア状況は、毎月1日・16日のリセットでいっしょに戻るようになりました（初クリアのジェムは、これまでどおり毎月1日だけリセットです）。\n・ホーム画面の下のバーと画面の下のあいだにできていた隙間、イベントが最後まで進むと先頭に戻らない不具合、アカウント管理画面の上部がカメラに重なってボタンを押せない不具合を修正しました。\n\n記念として、全ユーザーに フェス限定ガチャチケット70枚 をお贈りします。チケットはどのフェスでも共通で使え、回すときに自動で優先して使われます（1枚＝1回ぶん）。\n\n※ 🎫チケットは、次に MagiBurst を開いたときにまとめて届きます。\n\nこれからも XEVARION をよろしくお願いします。",
    mb:{ ticket:70 } },
  /* ── 2026-08-10 大型アップデート記念（12,000 XEVA） ── */
  { id:"mail_update_260810", icon:"🎉", title:"アップデート記念 配布（12,000 XEVA）", date:"2026-08-10",
    body:"いつも XEVARION をご利用いただきありがとうございます。\n\n今回のアップデートでは、ガチャまわりを大きく作り直しました。\n\n・ガチャの結果が1枚ずつ公開される豪華な演出になりました。★4から★5へ上がる「RANK UP!!」の昇格演出も入ります。\n・ピックアップは絵を押してその場で確認するだけで入れ替えられるようになりました。\n・提供割合にキャラクターの絵が並び、確率が名前のとなりに出るようになりました。押すとそのキャラの性能も見られます。\n・キャラクター図鑑に MagiBurst のキャラクターがすべて並ぶようになり、詳細もガチャと同じ性能画面になりました。\n・アカウントのアイコンを、アプリに関係なく全キャラクターから選べるようになりました。\n・ホームの下のバーのアイコンを、色つきの新しいデザインに作り直しました。\n\nMagiBurst 側では、お気に入り機能・ミッションのまとめて受け取り・ハイクロススティンガーの強化・ヴァニッシュボックスの作り直しなどを行っています。あわせて、Shop に残っていたガチャの引くボタンでジェムだけが減ってしまう不具合も修正しました。\n\n記念として、全ユーザーに 12,000 XEVA をお贈りします。\n\nこれからも XEVARION をよろしくお願いします。",
    amount:12000 },
  /* ── 2026-08-08 サマーキャンペーン ── */
  { id:"mail_summer_260808", icon:"☀️", title:"サマーキャンペーン 配布（6,000 XEVA）", date:"2026-08-08",
    body:"いつも XEVARION をご利用いただきありがとうございます。\n\nこのなつをいっしょに驆けぬけるみなさまへ、サマーキャンペーンとして 6,000 XEVA をお贈りします。\n\nMagiBurst にはプレミアム新★5「カエデ」「リノン」「ココロ」「アンジェ」の4体が参戦し、フルバーストの演出も新しく作り直しました。全体のスピードも上がっています。\n\nこれからも XEVARION をよろしくお願いします。",
    amount:6000 },
  /* ── 2026-08-03 アップデート記念 ──
     XEVA と 🎫フェスチケットの両方が入るメール。
     🎫は MagiBurst のセーブにしか置き場所がないので、受け取ると引換券が積まれ、
     次に MagiBurst を開いたときに精算される。 */
  { id:"mail_update_260803", icon:"🎁", title:"アップデート記念 配布（6,000 XEVA ＋ 🎫20枚）", date:"2026-08-03",
    body:"いつも XEVARION をご利用いただきありがとうございます。\n\n今回のアップデートでは、アカウントの同期をいちから作り直しました。ログアウトしてから新しく登録したときに前のアカウントのデータが引き継がれてしまう不具合、XEVA・ジェム・ショップの購入が端末どうしでそろわない不具合を修正しています。あわせて iPhone でアプリとして開いたときに画面の下にできていた空白もなくしました。\n\nMagiBurst には 幽冥の庭園 第8〜10ノ園 と新ギミック「減速壁」が加わり、ヒーリングバルーンやダメージ計算も見直しています。\n\n記念として、全ユーザーに 6,000 XEVA と フェス限定ガチャチケット20枚 をお贈りします。\n\n※ 🎫チケットは、次に MagiBurst を開いたときにまとめて届きます。",
    amount:6000, mb:{ ticket:20 } },
  /* ── ここから MagiBurst から移設した配布物（2026-07-30） ──
     mbFrom = MagiBurst 旧メールボックスでの id。既に向こうで受け取っていたら
     seedMails() が最初から「受取済」にして二重配布を防ぐ。 */
  { id:"mb_fes_ticket_2607", icon:"🎫", title:"✦ Nocturne Bloom Fest 開幕記念（MagiBurst）", date:"2026-07-27",
    body:"新クエスト（幽冥の庭園リニューアル）と、フェス限定★5「フィオナ」「ミルフィ」「メイベル」「アビス」「アーク」の参戦を記念して、フェス限定ガチャチケット20枚をお贈りします。\n\nチケットは Nocturne Bloom Fest 専用で、回すときに自動で優先して使われます（1枚＝1回ぶん）。\n\n※ MagiBurst を起動したときに受け取り処理が完了します。",
    mbFrom:"gift_festicket240_20260727", mb:{ ticket:20 } },
  { id:"mb_summer_gem_2607", icon:"☀️", title:"夏期間応援プレゼント（MagiBurst）", date:"2026-07-23",
    body:"暑い夏をいっしょに駆けぬけるみなさまへ——夏期間応援として ジェム100個 をお贈りします。\n\n新★5「セツナ」「セレネ」「ナズナ」「リリア」「レヴィア」が参戦したプレミアムセレクトガチャに、ぜひお使いください！",
    mbFrom:"gift_summer100_20260723", gem:100 },
  { id:"mb_ex_apology_2607", icon:"🙇", title:"EX降臨キャラ 所持リセットのお詫び（MagiBurst）", date:"2026-07-22",
    body:"EX降臨の出現条件と、シオン・ヴィオラ・アイラの性能を大きく見直したため、たいへん恐縮ですが3体の所持状況を全端末で一度リセットさせていただきました。\n\n3体はガチャ★5に少しだけ届かないくらいまで性能を強化しています。\n\nお詫びとして ジェム250個 をお贈りします。ぜひ再挑戦にお役立てください。",
    mbFrom:"apology_ex_reset_20260722", gem:250 },
  { id:"mb_garden_gem_2607", icon:"🌸", title:"幽冥の庭園 実装記念プレゼント（MagiBurst）", date:"2026-07-21",
    body:"超絶高難易度クエスト「幽冥の庭園」実装を記念して、全プレイヤーのみなさまに ジェム250個 をお贈りします。\n\n新キャラ「レゼリア」の登場したプレミアムセレクトガチャや、10連（★5確定）にぜひお使いください！",
    mbFrom:"gift_gem250_20260721", gem:250 },
  { id:"mail_renew_2607", icon:"\ud83c\udf08", title:"ホーム画面リニューアル記念 配布", date:"2026-07-28",
    body:"XEVARION のホーム画面が大きく生まれ変わりました！\n\nスマホ基準の明るいデザイン、Magi AI Assistant、アプリの並び替え、そして XEVARION 自体をアプリとしてインストールできるようになりました。\n\nリニューアルを記念して、全ユーザーに 6,000 XEVA を配布します！\n\nこれからも XEVARION をよろしくお願いします。", amount:6000 },
  { id:"mail_magiburst_open", icon:"💥", title:"MagiBurst 実装記念 配布", date:"2026-07-15",
    body:"新アプリ「MagiBurst」（引っぱりハンティング）が XEVARION に登場しました！\n\n実装を記念して、全ユーザーに 6,000 XEVA を配布します！\n\nさらに XEVA ガチャには Bシリーズ シーズン1〜3（ミオン／ココナ／マオ）が登場。MagiBurst のガチャにも同じ3人が★5として参戦しています。\n\n引っぱって、ぶっ飛ばそう！", amount:6000 },
  { id:"mail_maint_202607", icon:"🛠️", title:"緊急メンテナンスのお詫びと補填", date:"2026-07-05",
    body:"いつもXEVARIONをご利用いただきありがとうございます。\n\n緊急メンテナンスの実施により、サービスをご利用いただけない時間が発生しました。ご不便をおかけしたお詫びとして、全ユーザーに 6,000 XEVA を補填します。\n\n今後とも XEVARION をよろしくお願いいたします。", amount:6000 },
  { id:"mail_s5_open", icon:"🎰", title:"シーズン5「ミオン」開幕記念 配布", date:"2026-06-30",
    body:"XEVA ガチャに 新シーズン5 が登場しました！\n\n新SSRキャラクター「ミオン」の開幕を記念して、全ユーザーに 3,000 XEVA を配布します！\n\nガチャを回して、SSR「ミオン」を仲間にしよう！", amount:3000 },
  { id:"mail_001", icon:"🎁", title:"アップデート記念配布", date:"2026-06-29",
    body:"いつもXEVARIONをご利用いただきありがとうございます！\n\nメールボックス新設・ドック型UIへのリニューアルを記念して、全ユーザーに 3,000 XEVA を配布します！\n\nこれからもXEVARIONをよろしくお願いします。", amount:3000 },
  { id:"mail_002", icon:"🔄", title:"アカウントリセット補填", date:"2026-06-29",
    body:"MagiLink・XEVARIONのアカウント整理にともない、ご不便をおかけしたお詫びとして 3,000 XEVA を補填します。\n\nアイコンもガチャキャラクターと自動同期されるようになりました。引き続きご利用よろしくお願いします！", amount:3000 }
];

/* 【再配布】メールは廃止しました（配布済みのぶんは下の purge で削除します）。 */

// メールの受け取り期限：配布日（date）から60日間。過ぎたら自動で破棄する。
const MAIL_EXPIRY_DAYS = 60;
// 配布日から60日後の「その日の終わり」を期限とする（当日いっぱいは受け取れる）。
function mailExpiresAt(m) {
  const t = m && m.date ? Date.parse(m.date + "T00:00:00") : NaN;
  if (isNaN(t)) return Infinity; // 日付不明のメールは破棄しない（安全側）
  return t + MAIL_EXPIRY_DAYS * 86400000 + (86400000 - 1);
}
function isMailExpired(m) { return Date.now() > mailExpiresAt(m); }
// 期限までの残り日数（切り上げ）。期限なしは Infinity。
function mailDaysLeft(m) {
  const exp = mailExpiresAt(m);
  if (exp === Infinity) return Infinity;
  return Math.ceil((exp - Date.now()) / 86400000);
}

function loadMails() {
  let data = { items: [] };
  try { const r = localStorage.getItem(MAIL_KEY); if (r) { const p = JSON.parse(r); if (p && Array.isArray(p.items)) data = p; } } catch(e) {}
  // 受け取り期限（配布日から60日）を過ぎたメールは自動で破棄
  const before = data.items.length;
  data.items = data.items.filter(m => !isMailExpired(m));
  if (data.items.length !== before) saveMails(data);
  return data;
}
function saveMails(data) { try { localStorage.setItem(MAIL_KEY, JSON.stringify(data)); } catch(e) {} }

/* 過去に配布した「【再配布】…」メールをメールボックスから取り除く（未受取でも削除）。 */
function purgeRedistMails() {
  const data = loadMails();
  const before = data.items.length;
  data.items = data.items.filter(m => String(m.id || "").indexOf("mail_redist_") !== 0);
  if (data.items.length !== before) saveMails(data);
}

function seedMails() {
  purgeRedistMails();
  const data = loadMails();
  let changed = false;
  INITIAL_MAILS.forEach(m => {
    if (isMailExpired(m)) return; // 期限切れのメールは復活させない（自動破棄の再投入防止）
    if (!data.items.find(x => x.id === m.id)) {
      /* MagiBurst の旧メールボックスで受け取り済みなら、最初から「受取済」で置く */
      data.items.unshift(Object.assign({ claimed: mbAlreadyGot(m.mbFrom) }, m));
      changed = true;
    }
  });
  /* 新しい日付が上に来るように並べ替える（unshift だけだと配布順の逆になる） */
  data.items.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  saveMails(data);
}

function updateMailBadge() {
  const data = loadMails();
  const unread = data.items.filter(m => !m.claimed).length;
  const badge = document.getElementById("xhMailBdg");   /* ★ 2026-08-12 ホームのバッジへ直接 */
  if (!badge) return;
  if (unread > 0) { badge.textContent = unread > 9 ? "9+" : unread; badge.classList.add("show"); }
  else badge.classList.remove("show");
}

function openMail() {
  renderMailList();
  document.getElementById("mailOverlay").classList.add("open");
  document.getElementById("mailModal").classList.add("open");
}
function closeMail() {
  const ov = document.getElementById("mailOverlay");
  const md = document.getElementById("mailModal");
  if (ov) ov.classList.remove("open");
  if (md) md.classList.remove("open");
}

function claimMail(id) {
  const data = loadMails();
  const mail = data.items.find(m => m.id === id);
  if (!mail || mail.claimed) return;
  mail.claimed = true;
  saveMails(data);
  if (mail.amount > 0 && window.XEVA) {
    /* ★ メールの配布は月間XEVAランキングに載せない（noRank）。
       運営からの配布は「遊んで稼いだ量」ではないので、
       受け取った人だけが順位で有利になってしまう。 */
    window.XEVA.add(mail.amount, mail.title, { noRank: true });
    renderXevaBalance();
    renderXevaMissions();
  }
  /* 💎ジェム（XEVARION 共通ウォレット）。MagiBurst 由来のぶんは向こうで受け取り済みなら渡さない */
  if (mail.gem > 0 && window.XEVA && window.XEVA.gem && !mbAlreadyGot(mail.mbFrom)) {
    window.XEVA.gem.add(mail.gem, mail.title);
    if (window.xhRenderGem) window.xhRenderGem();
  }
  /* 🎫フェスチケット・ゴールドなど MagiBurst のセーブにしか置けないぶんは引換券を積む */
  if (mail.mb && !mbAlreadyGot(mail.mbFrom)) pushMbGift(mail.mbFrom || mail.id, mail.mb);
  if (mail.charId) {
    const GKEY = "xeva_gacha_v1";
    let G = { owned: {}, dupes: {}, points: {} };
    try { const r = localStorage.getItem(GKEY); if (r) G = JSON.parse(r); } catch(e) {}
    if (!G.owned) G.owned = {};
    if (!G.dupes) G.dupes = {};
    G.owned[mail.charId] = true;
    if (mail.charFull) G.dupes[mail.charId] = GACHA_MAX_DUPE;  // 完凸で付与
    try { localStorage.setItem(GKEY, JSON.stringify(G)); } catch(e) {}
    const ch = window.XEVA ? window.XEVA.CHARS.find(c => c.id === mail.charId) : null;
    if (ch) {
      const t = document.getElementById("xevaToast");
      if (t) {
        document.getElementById("xevaToastT1").textContent = "✨ " + ch.name;
        document.getElementById("xevaToastT2").textContent = "図鑑に追加されました！";
        t.classList.add("show");
        setTimeout(() => t.classList.remove("show"), 4200);
      }
    }
  }
  renderMailList();
  updateMailBadge();
  if (mail.amount > 0) showXevaToast(mail.amount, "「" + mail.title + "」");
}

/* ── 一括受け取り：未受取のメールをまとめて受け取る ──
   claimMail() を1件ずつ呼ぶと XEVA トーストが何度も重なるので、
   ここでは付与だけまとめて行い、最後に合計を1回だけ通知する。 */
function claimAllMails() {
  const data = loadMails();
  const targets = data.items.filter((m) => !m.claimed);
  if (!targets.length) return;
  let total = 0; const chars = [];
  const GKEY = "xeva_gacha_v1";
  let G = { owned: {}, dupes: {}, points: {} };
  try { const r = localStorage.getItem(GKEY); if (r) G = JSON.parse(r) || G; } catch (e) {}
  if (!G.owned) G.owned = {};
  if (!G.dupes) G.dupes = {};

  let gemTotal = 0;
  targets.forEach((m) => {
    m.claimed = true;
    if (m.amount > 0) total += m.amount;
    const dup = mbAlreadyGot(m.mbFrom);
    if (m.gem > 0 && !dup) gemTotal += m.gem;
    if (m.mb && !dup) pushMbGift(m.mbFrom || m.id, m.mb);
    if (m.charId) {
      G.owned[m.charId] = true;
      if (m.charFull) G.dupes[m.charId] = GACHA_MAX_DUPE;
      const ch = window.XEVA ? window.XEVA.CHARS.find((c) => c.id === m.charId) : null;
      if (ch) chars.push(ch.name);
    }
  });
  saveMails(data);
  try { localStorage.setItem(GKEY, JSON.stringify(G)); } catch (e) {}
  if (gemTotal > 0 && window.XEVA && window.XEVA.gem) {
    window.XEVA.gem.add(gemTotal, "メール一括受け取り（" + targets.length + "件）");
    if (window.xhRenderGem) window.xhRenderGem();
  }
  if (total > 0 && window.XEVA) {
    window.XEVA.add(total, "メール一括受け取り（" + targets.length + "件）", { noRank: true });
    renderXevaBalance();
    renderXevaMissions();
  }
  renderMailList();
  updateMailBadge();
  if (total > 0) showXevaToast(total, "メール" + targets.length + "件をまとめて受け取りました");
  else if (chars.length) showXevaToast(0, chars.join("・") + " を受け取りました");
}
window.claimAllMails = claimAllMails;

/* 一括受け取りボタンの表示・件数を更新 */
function updateMailAllBtn() {
  const btn = document.getElementById("mailAllBtn");
  if (!btn) return;
  const data = loadMails();
  const n = data.items.filter((m) => !m.claimed).length;
  btn.style.display = n ? "flex" : "none";
  const c = document.getElementById("mailAllCount");
  if (c) c.textContent = n;
}

function renderMailList() {
  const data = loadMails();
  const list = document.getElementById("mailList");
  if (!list) return;
  if (!data.items.length) {
    list.innerHTML = '<div class="mail-empty">📭 メールはありません</div>';
    updateMailAllBtn();
    return;
  }
  list.innerHTML = data.items.map(m => {
    const ch = m.charId && window.XEVA ? window.XEVA.CHARS.find(c => c.id === m.charId) : null;
    const iconHtml = ch
      ? `<img src="${charSmallPath(ch.file)}" style="width:46px;height:46px;border-radius:14px;object-fit:cover" alt="${ch.name}">`
      : `<div class="mail-item-icon">${m.icon || "📨"}</div>`;
    // 受け取り期限（未受取のみ表示）。残り3日以内は警告色。
    let expiryHtml = "";
    if (!m.claimed) {
      const left = mailDaysLeft(m);
      if (left !== Infinity) {
        const exp = new Date(mailExpiresAt(m));
        const expStr = exp.getFullYear() + "/" + (exp.getMonth() + 1) + "/" + exp.getDate();
        const soon = left <= 3;
        expiryHtml = `<div class="mail-item-expiry" style="font-size:10.5px;font-weight:700;margin-top:4px;color:${soon ? "#ff5d5d" : "rgba(34,52,77,.5)"}">⏳ 受け取り期限 ${expStr}（あと${Math.max(0, left)}日）</div>`;
      }
    }
    return `
    <div class="mail-item${m.claimed ? " claimed" : ""}">
      <div class="mail-item-icon" style="overflow:visible;background:none;padding:0">${iconHtml}</div>
      <div class="mail-item-body">
        <div class="mail-item-date">${m.date}</div>
        <div class="mail-item-title">${m.title}</div>
        <div class="mail-item-text">${m.body.replace(/\n/g, "<br>")}</div>
        ${m.amount > 0 ? `<div class="mail-item-reward">
          <img src="thumbs/XEVA.png" class="mail-xeva-icon" alt="XEVA">
          <span class="mail-reward-val">＋${m.amount.toLocaleString()} XEVA</span>
        </div>` : ""}
        ${m.gem > 0 ? `<div class="mail-item-reward">
          <img src="gem.png" class="mail-xeva-icon" alt="ジェム">
          <span class="mail-reward-val" style="color:#8e6bff">＋${m.gem.toLocaleString()} ジェム</span>
        </div>` : ""}
        ${m.mb && m.mb.ticket ? `<div class="mail-item-reward"><span style="font-size:11px;color:#c48bff;font-weight:700">🎫 フェス限定ガチャチケット ×${m.mb.ticket}</span></div>` : ""}
        ${m.mb && m.mb.gold ? `<div class="mail-item-reward"><span style="font-size:11px;color:#d79a1e;font-weight:700">🪙 ゴールド ×${m.mb.gold.toLocaleString()}</span></div>` : ""}
        ${m.mb ? `<div style="font-size:10px;font-weight:700;color:rgba(34,52,77,.5);margin-top:3px">※ MagiBurst を起動したときに反映されます</div>` : ""}
        ${ch ? `<div class="mail-item-reward"><span style="font-size:11px;color:#b18cff;font-weight:700">✨ ${ch.name} (${ch.rarity})</span></div>` : ""}
        ${expiryHtml}
      </div>
      <div class="mail-item-action">
        ${!m.claimed ? `<button class="mail-claim-btn" onclick="claimMail('${m.id}')">受け取る</button>` : '<div class="mail-claimed-badge">✓ 受取済</div>'}
      </div>
    </div>`;
  }).join("");
  updateMailAllBtn();
}

/* ── login bonus stamp card ──
   ★ 表示は「1日1回だけ」。付与の可否（XEVA.grantLoginBonus）はウォレットの lastLoginDate で
     判定しているが、ウォレットはクラウド同期でマージされるため、他端末の古い値が勝つと
     lastLoginDate が巻き戻って同じ日に何度もモーダルが出ることがあった。
     そこで表示済みマーカーを端末ローカル（同期対象外）に持ち、日付が変わるまで再表示しない。 */
const LB_SHOWN_KEY = "xeva_lb_shown_v1";   // 値: YYYY-MM-DD（xeva-cloud の SYNC_KEYS に入れないこと）
function lbShownToday() {
  try { return localStorage.getItem(LB_SHOWN_KEY) === new Date().toISOString().slice(0, 10); } catch (e) { return false; }
}
function markLbShown() {
  try { localStorage.setItem(LB_SHOWN_KEY, new Date().toISOString().slice(0, 10)); } catch (e) {}
}
function showLoginBonusModal(day, amount) {
  if (lbShownToday()) return;   // 今日はもう見せた
  markLbShown();
  const REWARDS = [50, 50, 50, 50, 50, 100, 150];
  const stamps = document.getElementById("lbStamps");
  if (!stamps) return;
  stamps.innerHTML = REWARDS.map((pt, i) => {
    const d = i + 1;
    const isDone = d < day;
    const isToday = d === day;
    let cls = "lb-stamp";
    if (isDone) cls += " done";
    if (isToday) cls += " today";
    if (isToday && d >= 6) cls += " special";
    const inner = isDone ? "✓" : isToday ? "★" : String(pt);
    return `<div class="${cls}">
      <div class="lb-stamp-circle">${inner}</div>
      <div class="lb-stamp-pt">${isDone || isToday ? "+" + pt : ""}</div>
      <div class="lb-day-n">${d}日</div>
    </div>`;
  }).join("");
  const val = document.getElementById("lbRewardVal");
  if (val) val.textContent = "＋" + amount;
  const streak = document.getElementById("lbStreak");
  if (streak) streak.textContent = day + "日連続ログイン" + (day >= 7 ? " 🏆" : day >= 3 ? " 🔥" : " ✨");
  const ov = document.getElementById("loginBonusOv");
  if (ov) ov.style.display = "flex";
}
function closeLoginBonus() {
  const ov = document.getElementById("loginBonusOv");
  if (ov) ov.style.display = "none";
}
function closeS4Banner() {
  const ov = document.getElementById("s4BannerOv");
  if (ov) ov.style.display = "none";
  window.location.href = "gacha.html";
}

/* ══════════ クラウドアカウント：アクセス画面 / サインイン ══════════ */
function xhEsc(s){ return String(s==null?"":s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function xevaLocalSession() { try { return JSON.parse(localStorage.getItem("xeva_session_v1") || "null"); } catch (e) { return null; } }
/* この端末はログイン中か（アカウントあり＆明示ログアウト/追い出しでない） */
function xevaLoggedIn() {
  const a = getAcc();
  if (!a || !a.setupDone) return false;
  const ls = xevaLocalSession();
  if (ls && ls.active === false) return false;
  return true;
}

let xhReady = false, xhMode = "";
/* ホーム画面を表示。ログイン中→アクセス画面（タップしてスタート）、未ログイン→サインイン画面 */
function showXevaHome(opts) {
  opts = opts || {};
  // ゲームページから追い出されて戻ってきた場合のフラグを拾う
  if (!opts.superseded) {
    try { if (sessionStorage.getItem("xeva_superseded") === "1") { sessionStorage.removeItem("xeva_superseded"); opts = Object.assign({}, opts, { superseded: true }); } } catch (e) {}
  }
  const ov = document.getElementById("xevaHome"); if (!ov) return;
  const logged = xevaLoggedIn();
  // ★ このタブで既に「タップしてスタート」済みなら、アプリから戻ってもアクセス画面を出さない
  if (logged && !opts.superseded) {
    let accessed = false;
    try { accessed = sessionStorage.getItem("xeva_accessed") === "1"; } catch (e) {}
    if (accessed) {
      ov.classList.remove("open");
      xhMode = "";
      xevaStartMusic();          // 再生中なら継続、自動再生がブロックされたら次の操作で再開
      enterPortal();
      return;
    }
  }
  const mode = logged ? "access" : "auth";
  // 同じモードで既に開いている（かつ通知でない）なら再準備しない
  if (ov.classList.contains("open") && xhMode === mode && !opts.superseded) return;
  xhMode = mode;
  ov.classList.toggle("access", logged);
  ov.classList.toggle("auth", !logged);
  ov.classList.add("open");
  document.getElementById("xhAcctMenu")?.classList.remove("open");
  if (logged) prepareAccessScreen(opts);
  else {
    xhSwitch("login"); xhBackToSearch();
    const idInp = document.getElementById("xhSearchId");
    const acc = getAcc();
    if (idInp && acc && acc.name && !idInp.value) idInp.value = acc.name;
    setTimeout(() => { const n = document.getElementById("xhSearchId"); if (n && !n.value) try { n.focus(); } catch (e) {} }, 150);
  }
}
window.showXevaHome = showXevaHome;
function hideXevaHome() { const ov = document.getElementById("xevaHome"); if (ov) ov.classList.remove("open"); }

/* ── アクセス画面（XEVARION Home 画像 → ロード後タップスタート） ── */
function prepareAccessScreen(opts) {
  const loading = document.getElementById("xhLoading"), start = document.getElementById("xhStart");
  const notice = document.getElementById("xhNotice"), hint = document.getElementById("xhHint");
  const acc = getAcc();
  if (hint) hint.textContent = acc && acc.name ? ("ようこそ、" + acc.name + " さん") : "";
  if (notice) {
    if (opts && opts.superseded) { notice.innerHTML = "⚠ 別の端末でログインされました。もう一度スタートすると、この端末で続きから遊べます。"; notice.classList.add("show"); }
    else notice.classList.remove("show");
  }
  xhReady = false;
  if (loading) loading.style.display = "flex";
  if (start) start.style.display = "none";
  const ready = () => { xhReady = true; if (loading) loading.style.display = "none"; if (start) start.style.display = "flex"; };
  const img = new Image(); img.onload = ready; img.onerror = ready; img.src = "thumbs/xevarion-home_s.jpg?v=2";
  if (img.complete) ready();
  setTimeout(ready, 2500);
}
/* アクセス画面タップ → スタート（音楽再生＋ポータルへ。追い出し済みならセッションを取り戻す） */
function xhAccessTap(e) {
  if (!xhReady) return;
  try { sessionStorage.setItem("xeva_accessed", "1"); } catch (e2) {}   // このタブではアクセス画面を再表示しない
  const ls = xevaLocalSession() || {}; ls.active = true;
  try { localStorage.setItem("xeva_session_v1", JSON.stringify(ls)); } catch (e2) {}
  try { if (window.XevaCloud && window.XevaCloud.reclaim) window.XevaCloud.reclaim(); } catch (e2) {}
  xevaStartMusic();            // ユーザー操作＝自動再生ポリシーを突破
  hideXevaHome();
  enterPortal();
}
window.xhAccessTap = xhAccessTap;

/* アクセス画面のアカウントメニュー */
function xhToggleAcctMenu() { document.getElementById("xhAcctMenu")?.classList.toggle("open"); }
window.xhToggleAcctMenu = xhToggleAcctMenu;
function xhChangeAccount() { xevaLogout(); }
window.xhChangeAccount = xhChangeAccount;
function xhOpenAccSettings() { xevaStartMusic(); hideXevaHome(); enterPortal(); setTimeout(() => openAccSettings(), 120); }
window.xhOpenAccSettings = xhOpenAccSettings;
function xhLogoutFromAccess() { xevaLogout(); }
window.xhLogoutFromAccess = xhLogoutFromAccess;

/* タブ切替（ログイン / 新規作成） */
function xhSwitch(which) {
  document.getElementById("xhTabLogin")?.classList.toggle("on", which === "login");
  document.getElementById("xhTabCreate")?.classList.toggle("on", which === "create");
  document.getElementById("xhPaneLogin")?.classList.toggle("on", which === "login");
  document.getElementById("xhPaneCreate")?.classList.toggle("on", which === "create");
}
window.xhSwitch = xhSwitch;

/* ── サインイン：ID検索 → アカウント選択 → 4桁PIN ── */
let xhSelected = null;
function xhBackToSearch() {
  xhSelected = null;
  const s1 = document.getElementById("xhLoginStep1"), s2 = document.getElementById("xhLoginStep2");
  if (s1) s1.style.display = "block"; if (s2) s2.style.display = "none";
  const c = document.getElementById("xhCandidates"); if (c) c.innerHTML = "";
  const m2 = document.getElementById("xhMsg2"); if (m2) m2.textContent = "";
}
window.xhBackToSearch = xhBackToSearch;
async function xhSearchAccounts() {
  const msg = document.getElementById("xhMsg"), btn = document.getElementById("xhSearchBtn"), box = document.getElementById("xhCandidates");
  const id = (document.getElementById("xhSearchId")?.value || "").trim();
  if (msg) { msg.style.color = "#e05a7a"; msg.textContent = ""; }
  if (box) box.innerHTML = "";
  if (!id) { if (msg) msg.textContent = "ID（表示名）を入力してください。"; return; }
  const FB = await waitXFB();
  if (!FB || !FB.searchAccounts) { if (msg) msg.textContent = "接続を確認しています。少し待って再度お試しください。"; return; }
  if (btn) { btn.disabled = true; btn.textContent = "検索中…"; }
  let rows = []; try { rows = await FB.searchAccounts(id); } catch (e) {}
  if (btn) { btn.disabled = false; btn.textContent = "🔍 アカウントを検索"; }
  if (!rows.length) { if (msg) msg.textContent = "そのIDのアカウントが見つかりません。"; return; }
  if (box) box.innerHTML = rows.map((r) => {
    const av = r.charFile ? charFullPath(r.charFile) : "thumbs/Xevarion.png";
    return '<button class="xh-cand" onclick="xhPickAccount(\'' + r.uid + '\',\'' + encodeURIComponent(r.name) + '\',\'' + encodeURIComponent(r.charFile || "") + '\')">' +
      '<img src="' + av + '" alt="" onerror="this.src=\'Xevarion.png\'"><div class="cn">' + xhEsc(r.name) + '</div><div class="cg">›</div></button>';
  }).join("");
}
window.xhSearchAccounts = xhSearchAccounts;
function xhPickAccount(uid, nameEnc, charEnc) {
  const name = decodeURIComponent(nameEnc), charFile = decodeURIComponent(charEnc);
  xhSelected = { uid, name, charFile };
  const av = charFile ? charFullPath(charFile) : "thumbs/Xevarion.png";
  const box = document.getElementById("xhSelAcct");
  if (box) box.innerHTML = '<img src="' + av + '" alt="" onerror="this.src=\'Xevarion.png\'"><div><div class="an">' + xhEsc(name) + '</div><div class="al">このアカウントでログイン</div></div>';
  document.getElementById("xhLoginStep1").style.display = "none";
  document.getElementById("xhLoginStep2").style.display = "block";
  const pin = document.getElementById("xhPin"); if (pin) { pin.value = ""; setTimeout(() => { try { pin.focus(); } catch (e) {} }, 120); }
  const m2 = document.getElementById("xhMsg2"); if (m2) m2.textContent = "";
}
window.xhPickAccount = xhPickAccount;
async function xhDoLogin() {
  const msg = document.getElementById("xhMsg2"), btn = document.getElementById("xhLoginBtn");
  const pin = (document.getElementById("xhPin")?.value || "").trim();
  if (msg) { msg.style.color = "#e05a7a"; msg.textContent = ""; }
  if (!xhSelected) { xhBackToSearch(); return; }
  if (!/^\d{4}$/.test(pin)) { if (msg) msg.textContent = "4桁の数字を入力してください。"; return; }
  if (!window.XevaCloud) { if (msg) msg.textContent = "接続を確認しています。"; return; }
  if (btn) { btn.disabled = true; btn.textContent = "ログイン中…"; }
  try {
    const r = await window.XevaCloud.login(xhSelected.name, pin);
    if (r && r.ok) { if (msg) { msg.style.color = "#17a673"; msg.textContent = "ログインしました！"; } return; } // login内でreload
    if (r && r.error === "notfound") { if (msg) msg.textContent = "アカウントが見つかりません。"; }
    else if (r && r.error === "pin") { if (msg) msg.textContent = "4桁パスワードが違います。"; }
    else { if (msg) msg.textContent = "ログインに失敗しました。通信環境を確認してください。"; }
  } catch (e) { if (msg) msg.textContent = "ログインに失敗しました。"; }
  if (btn) { btn.disabled = false; btn.textContent = "ログイン"; }
}
window.xhDoLogin = xhDoLogin;
function xhStartCreate() { hideXevaHome(); openAccWizard(); }
window.xhStartCreate = xhStartCreate;

/* ログアウト（アカウント設定／アクセス画面から） */
async function xevaLogout() {
  if (!confirm("この端末からログアウトしますか？\nデータはクラウドに保存されており、次回はID＋4桁PINで再ログインできます。")) return;
  closeAccSettings();
  if (window.XevaCloud) { await window.XevaCloud.logout(); }   // logout内で goHome（未ログイン→サインイン画面）
  else { const ls = xevaLocalSession() || {}; ls.active = false; try { localStorage.setItem("xeva_session_v1", JSON.stringify(ls)); } catch (e) {} showXevaHome(); }
}
window.xevaLogout = xevaLogout;

/* 別端末ログイン通知（xeva-cloud から呼ばれる）。ログインは保持したままアクセス画面へ戻す */
function onXevaSuperseded() { showXevaHome({ superseded: true }); }
window.onXevaSuperseded = onXevaSuperseded;

/* ══════════ バックグラウンド音楽（Flagship Arrival・テンポ連動） ══════════ */
const MUSIC_KEY = "xeva_music_v1";
let musicOn = (function () { try { return localStorage.getItem(MUSIC_KEY) !== "off"; } catch (e) { return true; } })();
let _ac = null, _analyser = null, _srcNode = null;
function musicEl() { return document.getElementById("xevaMusic"); }
/* 自作SVGスピーカーアイコン（端末差のない統一デザイン） */
const MUSIC_IC_ON = '<svg class="xvic" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 9v6h3.6L13 19.4V4.6L7.6 9H4Z" fill="currentColor"/><path d="M15.5 8.6a4.8 4.8 0 010 6.8M18 6.2a8.2 8.2 0 010 11.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const MUSIC_IC_OFF = '<svg class="xvic" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 9v6h3.6L13 19.4V4.6L7.6 9H4Z" fill="currentColor"/><path d="M15.6 9.6l5 5M20.6 9.6l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function paintMusicBtns() {
  /* ★ 2026-08-12b 対象はアクセス画面の #xhMusicBtn だけ（旧ホームの #musicFab は削除済み）。
     ホームの設定タブの BGM スイッチは xevarion-home.js の xhToggleMusic が塗る。 */
  ["xhMusicBtn"].forEach((id) => { const b = document.getElementById(id); if (b) { b.innerHTML = musicOn ? MUSIC_IC_ON : MUSIC_IC_OFF; b.classList.toggle("off", !musicOn); } });
}
/* AnalyserNode で低域エネルギーを拾い、--beat（0〜1）を更新 → UIが曲に連動 */
function setupAnalyser() {
  if (_analyser) return;
  try {
    const el = musicEl(); if (!el) return;
    _ac = new (window.AudioContext || window.webkitAudioContext)();
    _srcNode = _ac.createMediaElementSource(el);
    _analyser = _ac.createAnalyser(); _analyser.fftSize = 128;
    _srcNode.connect(_analyser); _analyser.connect(_ac.destination);
    const data = new Uint8Array(_analyser.frequencyBinCount);
    let cur = 0, hue = 265, prev = 0;
    const loop = () => {
      requestAnimationFrame(loop);
      if (!_analyser) return;
      _analyser.getByteFrequencyData(data);
      let sum = 0; for (let i = 0; i < 8; i++) sum += data[i];
      const v = Math.min(1, sum / 8 / 210);
      cur += (v - cur) * 0.35;
      // 画面の縁の色相：ビートの立ち上がりで大きく回り、静かな時はゆっくり流れる
      const attack = Math.max(0, cur - prev); prev = cur;
      hue = (hue + 0.25 + cur * 1.6 + attack * 60) % 360;
      const root = document.documentElement.style;
      root.setProperty("--beat", cur.toFixed(3));
      root.setProperty("--beathue", hue.toFixed(1));
    };
    loop();
  } catch (e) {}
}
function xevaStartMusic() {
  paintMusicBtns();
  if (!musicOn) return;
  const el = musicEl(); if (!el) return;
  setupAnalyser();
  try { if (_ac && _ac.state === "suspended") _ac.resume(); } catch (e) {}
  el.volume = 0.55;
  const p = el.play();
  if (p && p.then) p.then(() => document.body.classList.add("music-on")).catch(() => {});
  else document.body.classList.add("music-on");
}
function xevaToggleMusic() {
  musicOn = !musicOn; try { localStorage.setItem(MUSIC_KEY, musicOn ? "on" : "off"); } catch (e) {}
  const el = musicEl();
  if (musicOn) xevaStartMusic();
  else if (el) {
    try { el.pause(); } catch (e) {}
    document.documentElement.style.setProperty("--beat", "0");
    document.body.classList.remove("music-on");
    paintMusicBtns();
  }
}
window.xevaToggleMusic = xevaToggleMusic;

/* ── ポータル入場（アクセス画面で「タップしてスタート」した後に実行） ── */
let _portalEntered = false;
function enterPortal() {
  /* ★ 2026-08-12b ここで旧ホームの浮きボタン #musicFab に .show を付けていました。
     ホームに入ると body.xh-mode で消える作りだったので、
     「同期の読み込み中だけ左下に一瞬出る」原因になっていました。ボタンごと削除済み。 */
  paintMusicBtns();
  const acc = getAcc();
  // 端末別アクセスパスワード（任意）が設定されていれば、まず解錠を要求
  if (acc && acc.pwHash && !sessionStorage.getItem(SS_UNLOCKED)) {
    const lock = document.getElementById("accLock");
    if (lock) {
      const lockAvImg = document.getElementById("lockAvImg"), lockName = document.getElementById("lockName");
      if (lockAvImg && acc.charFile) lockAvImg.src = getCharImgPath(acc.charFile);
      if (lockName) lockName.textContent = acc.name || "XEVARION";
      lock.classList.add("open");
      const li = document.getElementById("lockInput"); if (li) setTimeout(() => { try { li.focus(); } catch (e) {} }, 80);
    }
    return;   // 解錠後 unlockAndContinue が runPortalBoot を担当
  }
  runPortalBoot();
}
function runPortalBoot() {
  if (_portalEntered) return;
  _portalEntered = true;
  /* ★ 2026-08-12c 「もう入場処理は済んだ」ことを外へ知らせる目印。
     xevarion-home.js はこの関数を包んでホーム（#xhome）を出すが、
     包む前に呼ばれてしまった場合（読み込み順の事故）は、
     この目印を見て自分でホームを出す。＝白い画面が残らない。 */
  try { window.__xevPortalEntered = true; } catch (e) {}
  const granted = window.XEVA.grantLoginBonus();
  renderXevaBalance();
  renderXevaMissions();
  renderNavUser();
  // ゲーム連携4桁パスワード: 未設定／未登録なら必須設定を強制、済んでいればゲーム賞金XEVAを受取
  setTimeout(async () => { if (!(await ensureGamePw())) claimGameRewards(); }, 900);
  if (granted.amount > 0) setTimeout(() => showLoginBonusModal(granted.day, granted.amount), 1300);
  setTimeout(checkBirthday, granted.amount > 0 ? 3400 : 1400);
  // 新シーズン登場バナー（ログイン時ポップアップ）は廃止しました。
  /* ★ 2026-08-10 新キャラのお知らせ。ログインボーナス・誕生日のあとに出す
     （同時に出すと重なって、どれを閉じたのか分からなくなるため）。 */
  setTimeout(showNewChars, granted.amount > 0 ? 4600 : 2200);
}

/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-10 新キャラクターのお知らせ

   ・前回このホームを開いたときから<b>増えたキャラだけ</b>を一覧で出す。
   ・顔ぶれと「いつ増えたか」は xeva.js の MB_CHAR_MASTER（since）が持ち主。
     キャラを足すときは xeva.js の1行に since を書くだけでここに出る。
   ・出したら「見た」ことにするので、同じキャラは二度出ない。
   ══════════════════════════════════════════════════════════════ */
function showNewChars() {
  if (!window.XEVA || !XEVA.newCharsUnseen) return;
  let list = [];
  try { list = XEVA.newCharsUnseen() || []; } catch (e) { return; }
  if (!list.length) return;
  const ov = document.getElementById("ncOverlay"), grid = document.getElementById("ncGrid");
  if (!ov || !grid) return;
  /* 出しすぎると1画面に収まらないので、新しいほうから12体まで */
  const show = list.slice(0, 12);
  document.getElementById("ncSub").textContent =
    list.length + "体が仲間に加わりました" + (list.length > show.length ? "（新しい" + show.length + "体を表示）" : "");
  grid.innerHTML = show.map((c) => `<div class="nc-c">
      <img src="${charSmallPath(c.file)}" alt="${c.name}" loading="lazy">
      <div class="nc-n">${c.name}</div>
      <div class="nc-d">${c.since || ""}</div>
    </div>`).join("");
  ov.classList.add("open");
  /* 見せた時点で控える（「あとで」で閉じても、もう一度は出さない） */
  try { XEVA.markNewCharsSeen(); } catch (e) {}
}
function closeNewChars() {
  const ov = document.getElementById("ncOverlay");
  if (ov) ov.classList.remove("open");
}
window.showNewChars = showNewChars;
window.closeNewChars = closeNewChars;

/* ── boot: 起動時は必ずホーム画面（ログイン中＝アクセス画面／未ログイン＝サインイン）を表示 ── */
addEventListener("load", () => {
  if (!window.XEVA) return;
  migrateCharFile();
  cdkResetWaveOnce();   // WAVETOYOU2026 を一度だけ再入手可能に
  seedMails();
  updateMailBadge();
  paintMusicBtns();
  showXevaHome();       // access（tap→enterPortal） or auth（ログイン/新規作成）
});

/* ── アクセスパスワード・ロックの早期表示（ラグ解消） ──
   従来はロック表示を load イベント（フォント/画像の読込待ち＝数秒遅延）で行っていたため、
   パスワード入力が出るまでラグがあった。DOMContentLoaded 時点で即座にロックを出す。
   （load 側のロック処理は冪等なので二重表示にはならない） */
function showAccessLockEarly() {
  try {
    if (!window.XEVA) return;
    const acc = getAcc();
    if (!acc || !acc.setupDone) return;
    if (!xevaLoggedIn()) return;   // 未ログイン（ログアウト/追い出し）はホーム画面が担当
    if (!acc.pwHash || sessionStorage.getItem(SS_UNLOCKED)) return;
    const lock = document.getElementById("accLock");
    if (!lock) return;
    const lockAvImg = document.getElementById("lockAvImg");
    const lockName = document.getElementById("lockName");
    if (lockAvImg && acc.charFile) lockAvImg.src = getCharImgPath(acc.charFile);
    if (lockName) lockName.textContent = acc.name || "XEVARION";
    lock.classList.add("open");
    const li = document.getElementById("lockInput");
    if (li) setTimeout(() => { try { li.focus(); } catch (e) {} }, 80);
  } catch (e) {}
}
/* 重い load を待たず、即ホーム画面（ログイン中＝アクセス画面／未ログイン＝サインイン）を表示。
   load 側の showXevaHome は冪等（同モードなら再準備しない）ので二重表示にはならない。
   ※ 端末別アクセスパスワードのロックは、アクセス画面で「タップしてスタート」した後の enterPortal が担当する。 */
function showXevaHomeEarly() {
  try { if (!window.XEVA) return; showXevaHome(); } catch (e) {}
}
/* ★★ 2026-08-12c 「同期のベールが消えたあと、白い画面がしばらく残る」の真因。
   ── 何が起きていたか ──
   このファイルは <script defer> で読み込まれる。defer スクリプトが動く時点で
   document.readyState は既に <b>"interactive"</b>（"loading" ではない）。
   つまり下の分岐は<b>必ず else 側＝その場で実行</b>に入っていた。
   ところが showXevaHomeEarly → enterPortal → runPortalBoot の runPortalBoot を
   「呼んだあとホームを出す」形に包んでいるのは<b>次に読まれる xevarion-home.js</b>。
   まだ包まれていないので、ここで走ると
     ・入場処理だけが済んで _portalEntered が立つ
     ・ホーム（#xhome）は表示されない
   となり、ホームが出るのは load イベント（＝画像・音声・フォントの読み込み完了）
   まで待たされていた。その間に同期のベールは xeva:synced で消えるので、
   <b>ベールが消えたあと、素のポータル背景（ほぼ白）だけが数秒見える</b>。
   ── 直しかた ──
   defer の実行中に DOMContentLoaded はまだ飛んでいないので、
   "complete" 以外は必ずイベントで待つ。こうすると
   <b>すべての defer スクリプトが走ったあと</b>＝包まれたあとに呼ばれ、
   ホームは DOMContentLoaded の時点で出る（load は待たない）。 */
if (document.readyState === "complete") {
  showXevaHomeEarly();
} else {
  document.addEventListener("DOMContentLoaded", showXevaHomeEarly, { once: true });
}

/* ── CDK交換 ── */
const CDK_STORE = "xeva_cdk_v1";
const GACHA_MAX_DUPE = 4; // 完凸＝1体＋4凸＝5体分
const CDK_CODES = {
  "WAVETOYOU2026": { charId: "ayaka", name: "アヤカ（完凸・5体分）", full: true },
  "CHEERFORAYAKA": { xeva: 1500, name: "1500 XEVA" },
  "SAMURAIBLUE2026": { xeva: 30000, name: "30,000 XEVA" },
  "SAMURAIBLUE2027": { xeva: 1000000, name: "1,000,000 XEVA" },
  "CHEERFORKOKONA2026": { charId: "kokona", name: "ココナ（完凸・5体分）", full: true },
  "CHEERFORAYAKA2026": { charId: "ayaka", name: "アヤカ（完凸・5体分）", full: true }
};

// WAVETOYOU2026 を一度だけリセット（凸システム対応で「完凸5体分」へ仕様変更したため、使用済みでも再入手可能にする）
function cdkResetWaveOnce() {
  const FLAG = "xeva_cdk_reset_wavetoyou_v1";
  try {
    if (localStorage.getItem(FLAG)) return;
    const used = loadCdkUsed();
    if (used["WAVETOYOU2026"]) { delete used["WAVETOYOU2026"]; saveCdkUsed(used); }
    localStorage.setItem(FLAG, "1");
  } catch(e) {}
}

function loadCdkUsed() {
  try { return JSON.parse(localStorage.getItem(CDK_STORE) || "{}"); } catch(e) { return {}; }
}
function saveCdkUsed(d) {
  try { localStorage.setItem(CDK_STORE, JSON.stringify(d)); } catch(e) {}
}

function openCdkModal() {
  const ov = document.getElementById("cdkOverlay");
  const md = document.getElementById("cdkModal");
  const inp = document.getElementById("cdkInput");
  if (!ov || !md) return;
  ov.style.opacity = "1"; ov.style.pointerEvents = "auto";
  md.style.opacity = "1"; md.style.pointerEvents = "auto";
  md.style.transform = "translateY(0) scale(1)";
  document.getElementById("cdkPortalMsg").textContent = "";
  document.getElementById("cdkPortalResult").style.display = "none";
  if (inp) { inp.value = ""; inp.focus(); }
}
function closeCdkModal() {
  const ov = document.getElementById("cdkOverlay");
  const md = document.getElementById("cdkModal");
  if (!ov || !md) return;
  ov.style.opacity = "0"; ov.style.pointerEvents = "none";
  md.style.opacity = "0"; md.style.pointerEvents = "none";
  md.style.transform = "translateY(16px) scale(.97)";
}

function redeemCdkPortal() {
  const code = (document.getElementById("cdkInput")?.value || "").trim().toUpperCase();
  const msg = document.getElementById("cdkPortalMsg");
  if (!code) { msg.style.color = "#ff6b8a"; msg.textContent = "コードを入力してください。"; return; }
  const used = loadCdkUsed();
  if (used[code]) { msg.style.color = "#ff6b8a"; msg.textContent = "このコードはすでに使用済みです。"; return; }
  const entry = CDK_CODES[code];
  if (!entry) { msg.style.color = "#ff6b8a"; msg.textContent = "無効なコードです。"; return; }

  used[code] = Date.now(); saveCdkUsed(used);

  const today = new Date().toISOString().slice(0, 10);
  const mailData = loadMails();

  if (entry.xeva) {
    // XEVA 配布タイプ
    mailData.items.unshift({
      id: "cdk_" + code + "_" + Date.now(),
      icon: "🎁",
      title: "CDK特典：" + (entry.name || (entry.xeva + " XEVA")),
      date: today,
      body: "CDKコード特典として " + entry.xeva.toLocaleString() + " XEVA をお届けします！\nメールから受け取ってください。",
      amount: entry.xeva,
      claimed: false
    });
  } else {
    // キャラクター配布タイプ
    const ch = window.XEVA ? window.XEVA.CHARS.find(c => c.id === entry.charId) : null;
    const charName = ch ? ch.name : (entry.name || entry.charId);
    mailData.items.unshift({
      id: "cdk_" + code + "_" + Date.now(),
      icon: "🎁",
      title: "CDK特典：" + charName,
      date: today,
      body: entry.full
        ? "CDKコード特典として「" + charName + "」を完凸（1体＋4凸＝5体分）でお届けします！\nメールを受け取ると図鑑に追加され、凸も最大まで反映されます。"
        : "CDKコード特典として「" + charName + "」をお届けします！\nメールを受け取るとキャラクターが図鑑に追加されます。",
      amount: 0,
      charId: entry.charId,
      charFull: !!entry.full,
      claimed: false
    });
  }
  saveMails(mailData);
  updateMailBadge();

  msg.style.color = "#37e0a0";
  msg.textContent = "✨ メールボックスに送信しました！";
  const res = document.getElementById("cdkPortalResult");
  if (res) res.style.display = "none";
}

/* ============================================================
   多言語対応（日本語 ⇄ English）
   テキストノードを走査し、辞書に一致する語句を置換する方式。
   要素にタグ付け不要で、辞書に追加するだけで翻訳範囲を拡張できる。
   ============================================================ */
const LS_LANG = "xev_lang";
const I18N_EN = {
  // ナビ / 共通
  "提携": "Partners",
  "アプリを見る": "Explore Apps",
  "ORDYXIS を開く": "Open ORDYXIS",
  "NGX 公式サイトへ": "Visit NGX Official Site",
  "Magical Future 公式サイト →": "Magical Future Official Site →",
  "お知らせ": "News",
  "アカウント設定": "Account Settings",
  "キャラクター図鑑": "Character Gallery",
  "XEVA ガチャ": "XEVA Gacha",
  "公式サイト": "Official Site",
  "ハブ画面": "Hub Screen",
  // ヒーロー
  "NGX と Magical Future のアプリが、ひとつのプラットフォームへ。": "NGX and Magical Future apps, unified into one platform.",
  "MagiOneX・MagiOne × MeruHub の全アプリ、そして": "Every MagiOneX, MagiOne & MeruHub app — and even",
  "ORDYXIS 完全版": "the ORDYXIS Full Edition",
  "まで。": ".",
  "あなたの創造力を解き放つ、次世代アプリポータル。": "A next-generation app portal that unleashes your creativity.",
  // セクション見出し
  "MagiOne の進化系フラッグシップ。日々使う中核アプリ — つながる・学ぶ・競う・育てる を、ひとつ上の体験で。":
    "The evolved flagship of MagiOne. The core apps you use daily — connect, learn, compete, and grow — taken to the next level.",
  "魔法のような体験を届けるコミュニケーション＆ゲームアプリコレクション。つながり、学び、競い、楽しもう。":
    "A collection of communication & game apps that deliver a magical experience. Connect, learn, compete, and have fun.",
  "学習・音楽・ゲームを一つのエコシステムへ。生産性と娯楽を融合させた次世代ユーティリティコレクション。":
    "Study, music, and games in one ecosystem. A next-gen utility collection blending productivity and entertainment.",
  "店頭オンラインオーダーシステム。各画面はハブ画面を経由して開きます。":
    "In-store online ordering system. Each screen opens via the hub screen.",
  // アプリ説明（MagiOneX / MagiOne）
  "魔法のようなメッセージ体験。友達やグループと、スタイリッシュかつ直感的につながるチャットアプリ。コレクション共有にも対応。":
    "A magical messaging experience. Connect with friends and groups through a stylish, intuitive chat app — now with collection sharing.",
  "魔法の書から問題が飛び出す！英単語・物理・化学・古文など難関大レベルの問題を出題・学習。発音つきで知識を魔法に変えよう。":
    "Questions leap from a book of magic! Study top-university-level English vocabulary, physics, chemistry, classics and more — with pronunciation. Turn knowledge into magic.",
  "1台で2〜4人の国盗り対戦。塗って奪うアクション版「国盗りパックマン」と、じっくり陣取りの「ぐんぐん国盗り」を収録。途中保存・ルール説明つき。":
    "Territory battles for 2–4 players on one device. Includes an action-style \"Conquest Pac\" and the strategic \"Steady Conquest\" mode. Save & resume, with rules included.",
  "iPadを囲んで2〜5人で遊ぶ、連鎖バクハツの陣取り頭脳戦。ルールは「マスをタップ」だけ・運の要素ゼロ。CPU対戦・盤面サイズ・ラウンド制限・途中保存に対応。":
    "A chain-reaction territory brain-battle for 2–5 players around one iPad. Just \"tap a cell\" — zero luck. CPU play, board sizes, round limits, and save & resume.",
  "買った株を証券コード・会社名で登録するだけの持ち株マネージャー。購入日から取得単価を自動逆引きし、伸び率・評価損益・資産配分・株価チャート・企業ニュースを一覧。日本株メイン（Yahoo Finance実データ）。":
    "A holdings manager — just register your stocks by ticker or company name. It auto-derives your cost basis from the purchase date and shows growth, gains/losses, allocation, charts, and company news. Mainly Japanese stocks (live Yahoo Finance data).",
  "iPad 1台でみんなと対戦する闘技場。オリジナルの陣取り「TAKAGAME」（6難易度・技・保存）に加え、オセロ・五目並べ・神経衰弱を収録。2〜6人。":
    "An arena to battle everyone on one iPad. Features the original territory game \"TAKAGAME\" (6 difficulties, skills, save) plus Othello, Gomoku, and Memory. 2–6 players.",
  "三角形・六角形の盤面に駒を置き、小さな三角形の3頂点を自分の色で揃えて獲得する陣取りパズル。相手の三角形を阻止する駆け引きも熱い。CPU対戦・1台で2〜4人対応。":
    "A territory puzzle: place pieces on a triangular/hexagonal board and claim small triangles by matching all 3 vertices in your color. Blocking your opponent is half the fun. CPU play, 2–4 players on one device.",
  "投資判断ターミナル。Yahoo Finance等からリアルタイムに株価・指数を取得し、買い時／売り時シグナル、業界別ホット、企業ニュース・専門家評価を1つに集約。":
    "An investment terminal. Pulls real-time prices and indices from Yahoo Finance and more, consolidating buy/sell signals, sector heat, company news, and analyst ratings.",
  "FIFAワールドカップ・サッカー各国リーグ・MLB・NBA・NFL・NHLの試合結果／今後の予定／順位表／試合内容／フォーメーションをまとめてチェック。実データをリアルタイム取得。":
    "Check results, schedules, standings, match details, and formations for the FIFA World Cup, soccer leagues, MLB, NBA, NFL, and NHL. Live real data.",
  "Tier表の作成からプレゼンまで。カードを魔法のように並べ替え、あなたのランキングを世界へ発信。":
    "From building tier lists to presenting them. Rearrange cards like magic and share your rankings with the world.",
  "勉強の盾となる管理アプリ。学習計画・進捗・達成をトラッキングして、最強の学習者へ。":
    "A management app that shields your studies. Track plans, progress, and achievements to become the strongest learner.",
  // ORDYXIS
  "NGX × Magical Future が贈る、店頭オンラインオーダーシステム。お客様の端末から注文し、お店で受付・番号でお呼び出し、店頭モニターで案内します。時間指定予約・FastPass・多言語対応など完全版の機能が揃っています。":
    "An in-store online ordering system by NGX × Magical Future. Customers order from their device; the store accepts and calls by number, guided on an in-store monitor. The full edition includes timed reservations, FastPass, and multilingual support.",
  "ハブ画面でアクセスコードの入力が必要です": "An access code is required on the hub screen",
  "ORDYXIS ハブを開く": "Open the ORDYXIS Hub",
  "お客様用 Customer": "Customer",
  "メニュー選択 → 注文 → 番号受け取り（お客様の端末）": "Choose menu → order → receive a number (customer's device)",
  "店舗用 Store": "Store",
  "受付・番号呼び出し・完了管理（お店のPC）": "Accept, call numbers, manage completion (store PC)",
  "モニター用 Monitor": "Monitor",
  "呼び出し中／準備中の番号を大きく表示（店頭ディスプレイ）": "Large display of called / in-progress numbers (in-store display)",
  // 提携 / NGX
  "Magical Future との提携": "Partnership with Magical Future",
  "XevarionはMagical Future社と提携し、一部のアプリを共同で提供しています。提携対象は":
    "Xevarion partners with Magical Future to co-deliver some apps. The partnership covers",
  "と": " and ",
  "で、これらのアプリは起動時のロゴ表示に Magical Future のロゴを含みます。両社の技術・クリエイティビティの融合で、より豊かなアプリ体験をお届けします。":
    ", and these apps include the Magical Future logo on their startup splash. By fusing both companies' technology and creativity, we deliver a richer app experience.",
  "Xevarionはすべて、NGXによって開発・運営されています。最新情報・公式発表・コミュニティはNGX公式サイトへ。":
    "Xevarion is entirely developed and operated by NGX. For the latest updates, official announcements, and community, visit the NGX official site.",
  // フッター
  "NGX × Magical Future が贈る、次世代アプリポータル。MagiOneX・MagiOneとMeruHub、ふたつの世界がここに交わる。":
    "A next-generation app portal by NGX × Magical Future, where the worlds of MagiOneX・MagiOne and MeruHub meet.",
  // ジャンルタブ
  "✦ すべて": "✦ All", "💬 コミュニケーション": "💬 Communication", "📚 学習": "📚 Learning",
  "🎮 ゲーム": "🎮 Games", "📊 情報": "📊 Info"
};

let _xevLang = localStorage.getItem(LS_LANG) || "ja";

function _xevWalkText(root, fn) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentNode;
      if (!p) return NodeFilter.FILTER_REJECT;
      const tag = p.nodeName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  let n; while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(fn);
}

function applyLang(lang) {
  if (lang === "en") {
    _xevWalkText(document.body, (node) => {
      const key = node.nodeValue.trim();
      const en = I18N_EN[key];
      if (en !== undefined) {
        if (node.__ja === undefined) node.__ja = node.nodeValue;
        node.nodeValue = node.nodeValue.replace(key, en);
      }
    });
    document.documentElement.lang = "en";
  } else {
    _xevWalkText(document.body, (node) => {
      if (node.__ja !== undefined) node.nodeValue = node.__ja;
    });
    document.documentElement.lang = "ja";
  }
  _xevLang = lang;
  try { localStorage.setItem(LS_LANG, lang); } catch (e) {}
  document.querySelectorAll(".lang-toggle").forEach((b) => { b.textContent = lang === "en" ? "🌐 日本語" : "🌐 EN"; });
}

function toggleLang() { applyLang(_xevLang === "en" ? "ja" : "en"); }

addEventListener("DOMContentLoaded", () => { if (_xevLang === "en") applyLang("en"); });

/* ── ヒーローの浮遊アイコン：MagiOneX シリーズからランダムに5つ選出 ── */
(function () {
  const POOL = [
    "thumbs/MagiLink.jpg", "thumbs/MagiLex.jpg", "thumbs/MagiEmpire.jpg",
    "thumbs/MagiCraft.jpg", "thumbs/MagiChainParty.jpg", "thumbs/MagiShareCore.jpg",
    "thumbs/MagiPortfolio.jpg", "thumbs/MagiRanking.jpg", "thumbs/MagiBattle.jpg",
  ];
  const tiles = document.querySelectorAll(".hero-art .ha-tile:not(.main) img");
  if (!tiles.length) return;
  const pool = POOL.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  tiles.forEach((img, i) => { if (pool[i]) img.src = pool[i]; });
})();


/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-08 下バーの位置ズレを「両方向」で直す（--xh-fixgap / --xh-growb）

   ── これまでダメだった理由 ──
   前の版は「箱が実際の画面より短いときだけ」を測っていた（片方向）。
   ところが下バーがズレる原因は<b>2つあって向きが逆</b>:
     ① iOS のブラウザ表示 … 下部ツールバーぶん、<b>見えている</b>ほうが短い
        → バーは箱の下端（＝ツールバーの裏）に行くので、上へ戻す必要がある
     ② iOS のアプリ表示   … ホームバーぶん、<b>箱</b>のほうが短いことがある
        → バーは画面の下端に届かないので、下へ伸ばす必要がある
   片方向しか直さないと、もう一方は測っても 0 に丸められて素通りしていた。
   ＝「測っているのに直らない」状態。これが今回の作り直しの理由。

   ── 新しい測りかた ──
   「箱の下端」と「見えている下端」の差を<b>符号つき</b>で1回だけ求める。
       fixgap = (vv.offsetTop + vv.height) - 箱の高さ
     ・正 … 見えている下端のほうが下 → バーを下へ伸ばす
     ・負 … 見えている下端のほうが上 → バーを上へ戻す
   CSS 側は bottom:calc(-1 * var(--xh-fixgap)) の1本で両方向をまかなえる。

   ★ 箱の高さは documentElement.clientHeight ではなく
     「position:fixed; top:0; bottom:0 の目印の実測値」を使う。
     これは position:fixed がぶら下がる箱そのものなので、
     clientHeight とズレる環境でも必ず正しい。

   ── --xh-growb ──
   下へ伸ばしたぶん（fixgap の正の部分）。バーの中身をホームバーから
   離す距離は max(env(safe-area-inset-bottom), --xh-growb) で決める。
   env() が 0 を返す端末でも、下へ伸ばしたぶんだけは必ず内側に余白が入る。
   ★ 以前は max(env, fixgap) を「伸ばしていないとき」にも掛けていたため、
     余白が二重に入って<b>バーが浮いて見える</b>ことがあった。
   ══════════════════════════════════════════════════════════════ */
(function () {
  /* ★ 2026-08-10: 上限を 130px に絞った。
     下バーは本体を 240px 下へはみ出させて描いている（DOCK_OVERHANG）。
     上限が 160px のままだと「上へ 160px 戻す」ことがあり得て、
     はみ出し 140px（当時）を超える＝バーの下に最大 20px の隙間が残った。
     はみ出し量 > 測定誤差の上限 にしておけば、どちらへズレても
     バーは必ず画面の下端を越える＝隙間が原理的に出ない。 */
  var MAXG = 130;          // これ以上の差は測り損ねとみなす
  var probe = null;

  /* position:fixed がぶら下がる箱の高さを実測する */
  function boxHeight() {
    var host = document.body || document.documentElement;
    if (host && !(probe && probe.parentNode)) {
      probe = document.createElement("div");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText =
        "position:fixed;top:0;bottom:0;left:0;width:0;margin:0;padding:0;border:0;" +
        "visibility:hidden;pointer-events:none;z-index:-2147483000";
      host.appendChild(probe);
    }
    var h = 0;
    if (probe) { try { h = probe.getBoundingClientRect().height; } catch (e) { h = 0; } }
    if (!(h > 200)) h = (document.documentElement && document.documentElement.clientHeight) || 0;
    return h;
  }

  /* ★ 2026-08-12 「ときどき隙間が空く」への対策。
     ── 何が起きていたか ──
     ズレの量そのものは正しく測れていた。問題は<b>測り直す機会</b>で、
       ・別のアプリから戻ってきた（＝ページが凍結から復帰した）
       ・画面を回した／ブラウザのツールバーが出入りした直後
       ・スクロールでツールバーが縮んだ
     といったときに visualViewport の resize が飛ばない（または飛ぶ前に描かれる）ことがあり、
     <b>古い測定値のまま</b>バーが置かれて隙間が残っていた。
     ── 直しかた ──
     ① 復帰・フォーカス・スクロールでも測り直す（下の addEventListener 群）
     ② 測り直したあと、<b>次のフレームでもう一度</b>測る（1回目は値が古いことがある）
     ③ 直前の値と同じなら何もしない（毎スクロールで書き換えて重くならないように）
     ★ 上限（MAXG）は据え置き。はみ出し（--xh-dockover 240px）のほうが大きいので、
       測り損ねて 0 に丸めても、はみ出しが画面の下端を必ず越える。 */
  /* ── env(safe-area-inset-bottom) の実測 ──
     CSS の env() を JS から読む方法は無いので、padding-bottom に env() を入れた
     高さ0の目印を置き、その高さ（＝padding ぶん）を読む。 */
  /* ★ 2026-08-12c この目印は2つのことを同時に教えてくれる。
       ① 高さ         … env(safe-area-inset-bottom) の実測値（ホームバーの帯の厚み）
       ② 下端(bottom) … position:fixed;bottom:0 が着く場所
                        ＝ viewport-fit=cover では<b>本当の画面の下端</b>
     ②は visualViewport とは別の座標なので、両方を突き合わせる（下の fitBar）。 */
  var envProbe = null;
  function envInfo() {
    var host = document.body || document.documentElement;
    if (host && !(envProbe && envProbe.parentNode)) {
      envProbe = document.createElement("div");
      envProbe.setAttribute("aria-hidden", "true");
      envProbe.style.cssText =
        "position:fixed;left:0;bottom:0;width:0;height:0;margin:0;border:0;" +
        "padding:0 0 env(safe-area-inset-bottom,0px) 0;" +
        "visibility:hidden;pointer-events:none;z-index:-2147483000";
      host.appendChild(envProbe);
    }
    var r = null;
    if (envProbe) { try { r = envProbe.getBoundingClientRect(); } catch (e) { r = null; } }
    if (!r) return { env: 0, bottom: 0, ok: false };
    return { env: r.height > 0 && r.height < 120 ? r.height : 0, bottom: r.bottom, ok: true };
  }

  /* ★★ 2026-08-12b ホームの下バーの中身を「実測して」画面の下端に合わせる。
     ── なぜ必要か ──
     これまでは箱のズレ（--xh-fixgap）を測って位置を直し、中身の余白は
     env(safe-area-inset-bottom) を<b>そのまま信じて</b>いた。つまり
     「中身が最後にどこに来たか」は一度も確かめていない。fixgap の測定が
     少しでも外れる／env() が箱の作られかたと食いちがうと、そのぶん中身だけが
     持ち上がり、バーの下に<b>色は同じだが何も無い帯</b>が残る＝これが「隙間」。
     ── どう直すか ──
     タブのボタンの実際の下端と「見えている画面の下端」を比べ、その差ぶんだけ
     --xh-barpad を足し引きする。原因が何であれ狙った位置に収束する。
       ねらい: ボタンの下端 = 画面の下端 −（env + 4px）
       ★ 2026-08-12c この「画面の下端」の出しかたを作り直した（下の fitBar 参照）。
     ★ ホームバーのある端末（env>0）では env ぶんだけ内側に入れる。無い端末では
       4px だけ空ける。バー本体は --xh-dockover(240px) ぶん常に下へはみ出すので、
       ここをどう動かしても背景が途切れることはない。 */
  var BARPAD_MAX = 180;
  function fitBar() {
    var home = document.getElementById("xhome");
    if (!home || !home.classList.contains("on")) return;
    var bar = home.querySelector(".xh-bar");
    var btn = bar && bar.querySelector(".xh-ntab");
    if (!btn) return;
    var vv = window.visualViewport;
    var box = boxHeight();
    if (!vv || !(box > 200)) return;
    /* キーボードが出ているあいだは見えている高さが極端に縮むので触らない */
    if (!(vv.height > box * 0.72)) return;
    /* ★★ 2026-08-12c 「バーが上のほうにあって、下に何もない帯が残る」の真因。
       ── 何が起きていたか ──
       ねらいの位置を <b>visualViewport の下端 −（env + 4）</b> で決めていた。
       ところが iPhone をホーム画面から「アプリとして」開くと、
       visualViewport.height が<b>すでにホームバーぶんを引いた高さ</b>を返すことがある。
       すると
         ・--xh-fixgap（＝visualViewport の下端 − 箱の下端）が -env になって
           #xhome の下端がホームバーぶん持ち上がる
         ・その上でさらに env ぶんの余白（--xh-barpad）を入れる
       と<b>同じ env を2回引く</b>ことになり、バーの中身が env ぶん（iPhone なら約34pt）
       余計に高い位置で止まる。バー本体は 240px はみ出しているので背景は下まで
       続いており、「色は同じだが何も無い帯」だけが残る＝「バーが上にある」。
       ── 直しかた ──
       「本当の画面の下端」を2つの測りかたで出して突き合わせる。
         A: visualViewport の下端
         B: position:fixed;bottom:0 が着く下端（envInfo().bottom）
       ・B のほうが env より大きく下 … ブラウザの下部ツールバーが隠している
                                      → 見えている A に合わせる（バーが裏に入らない）
       ・それ以外                   … 下にあるほう＝max(A,B) が本当の画面の下端
       どちらの端末でも env を引くのは<b>1回だけ</b>になる。 */
    var ei = envInfo();
    var envB = ei.env;
    var visBottom = (vv.offsetTop || 0) + vv.height;
    var fixBottom = ei.ok ? ei.bottom : visBottom;
    var screenBottom = (fixBottom - visBottom > envB + 2) ? visBottom : Math.max(visBottom, fixBottom);
    var want = envB + 4;
    var root = document.documentElement;
    var cur = parseFloat(root.style.getPropertyValue("--xh-barpad"));
    if (!isFinite(cur)) {
      /* まだ JS が入れていない＝CSS の既定値。実際に効いている値を読む。 */
      var pb = parseFloat(getComputedStyle(bar).paddingBottom) || 0;
      var ov = parseFloat(getComputedStyle(root).getPropertyValue("--xh-dockover")) || 0;
      cur = pb - ov;
    }
    var err = btn.getBoundingClientRect().bottom - (screenBottom - want);
    if (Math.abs(err) < 0.6) return;            // すでに合っている
    var next = Math.max(0, Math.min(BARPAD_MAX, Math.round((cur + err) * 10) / 10));
    if (next !== Math.round(cur * 10) / 10) root.style.setProperty("--xh-barpad", next + "px");
  }
  window.xhFitBar = fitBar;

  function sync(again) {
    var vv = window.visualViewport;
    var box = boxHeight();
    var g = 0;
    if (vv && box > 200) {
      /* キーボードが出ていると見えている高さが極端に縮む。そのときは触らない
         （触るとバーが画面の中ほどまで飛び出す）。 */
      if (vv.height > box * 0.72) {
        g = Math.round((vv.offsetTop || 0) + vv.height - box);
        if (Math.abs(g) > MAXG) g = 0;
      }
    }
    /* ★ 測ったあと、次のフレームでもう一度だけ測り直す（again で無限ループを防ぐ） */
    if (!again) { try { requestAnimationFrame(function () { sync(true); }); } catch (e) {} }
    var root = document.documentElement;
    var grow = g > 0 ? g : 0;
    if (root.style.getPropertyValue("--xh-fixgap") !== g + "px") {
      root.style.setProperty("--xh-fixgap", g + "px");
    }
    if (root.style.getPropertyValue("--xh-growb") !== grow + "px") {
      root.style.setProperty("--xh-growb", grow + "px");
    }
    /* ★ 位置を直したあとで、中身が本当に下端に来ているかを実測して詰める */
    try { fitBar(); } catch (e) {}
  }
  window.xhSyncFixGap = function () { sync(); };
  var onSync = function () { sync(); };
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", onSync);
    window.visualViewport.addEventListener("scroll", onSync);
  }
  window.addEventListener("resize", onSync);
  window.addEventListener("orientationchange", function () { setTimeout(onSync, 260); setTimeout(onSync, 700); });
  window.addEventListener("pageshow", onSync);
  document.addEventListener("DOMContentLoaded", onSync);
  /* ★ 2026-08-12 ここから下が追加ぶん。
     ・visibilitychange / focus … 別アプリから戻ってきたとき（iOS はページを凍結するので
       resize が飛ばないまま復帰することがある）
     ・scroll … ブラウザの下部ツールバーが縮む・伸びるのはスクロール中に起きる
       （passive にしてスクロールの邪魔をしない） */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) { onSync(); setTimeout(onSync, 300); }
  });
  window.addEventListener("focus", onSync);
  try { window.addEventListener("scroll", onSync, { passive: true }); } catch (e) { window.addEventListener("scroll", onSync); }
  [0, 80, 250, 700, 1400, 2600].forEach(function (ms) { setTimeout(onSync, ms); });
  sync();
})();
