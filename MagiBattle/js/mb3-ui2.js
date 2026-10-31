/* ============================================================
   MagiBattle 3.0 — mb3-ui2.js（画面の後半：ストーリー・キャンペーン・結果・アリーナ・迎撃戦・タワー・前哨基地・研究・ミッション・ショップ・アイテム・設定）
   ★★ 2026-10-31 ご指定（まとめて）：
     ・「キャラのストーリーの表示で LD 画像があるキャラは LD の方で」→ 全身の立ち絵（home-mate/lobby/）を大きく。ない子は縦長の絵の札。
     ・「ストーリーをアーカイブで見られるように」→ ストーリーの画面（章ごと・キャラのエピソード）。見たものからもう一度。
     ・「バトル結果の戻るを押すと、前の結果に戻る」→ 結果は「閉じる」でその前の画面（キャンペーン・タワー・アリーナ・迎撃戦）へ。結果は戻る先に積まない。
     ・「アリーナのデザインを改善」→ 段位の大きな札・相手のカード・防衛編成・記録・シーズンの表を色分け。
     ・ご指定「アリーナは基本的に自動」→ 撃つのもバーストも両方とも自動。
     ・「アイテムをまとめて使用」→ アイテムの画面（ギフトをまとめてわたす・強化への近道）・ショップは数をえらんで買う・任務はまとめて受け取る・研究はできるだけ。
     ・「オリジナル BGM」→ 設定で ON／OFF と音量（MB3.BGM）。
   ============================================================ */
(function () {
  "use strict";
  const MB3 = window.MB3, UI = MB3.UI;
  const ST = () => window.MBStats, SV = () => MB3.Save, D = () => MB3.D, NET = () => window.MB3NET;
  const { $, $$, esc, fmt, short } = UI;

  /* ══════════ ストーリー ══════════ */
  UI.story = function (key, cb) { const s = D().STORY[key]; if (!s) { if (cb) cb(); return; } UI.storyLines(s.t, s.bg, s.lines, cb, key); };
  UI.storyLines = function (title, bg, lines, cb, key) {
    if (key) SV().markSeen(key);
    const box = $("#story"); box.hidden = false;
    const prevBgm = (MB3.BGM && MB3.BGM.want && MB3.BGM.want()) || null;
    try { MB3.BGM && MB3.BGM.play("story"); } catch (e) {}
    let i = 0, typing = 0, full = "", auto = false, autoT = 0, hideBox = false;
    box.innerHTML = '<canvas class="st-bg" id="stBg"></canvas><div class="st-veil"></div><div class="st-chr" id="stChr"></div><div class="st-ttl">' + esc(title) + '</div>' +
      '<div class="st-ctl"><button id="stHide">隠す<small class="kb">H</small></button><button id="stAuto">AUTO<small class="kb">A</small></button><button id="stSkip">スキップ<small class="kb">Esc</small></button></div>' +
      '<div class="st-box"><div class="st-nm" id="stNm"></div><div class="st-tx" id="stTx"></div><div class="st-next">▼</div></div>';
    try { const c = $("#stBg", box), r = box.getBoundingClientRect(); const lw = 220, lh = Math.round(220 * r.height / Math.max(1, r.width)); const src = MB3.Spr.bg(typeof bg === "string" && MB3.Spr.THEME[bg] ? bg : "ruins", lw, lh, 0.55); c.width = lw; c.height = lh; c.getContext("2d").drawImage(src, 0, 0); } catch (e) {}
    const done = () => { clearInterval(typing); clearTimeout(autoT); window.removeEventListener("keydown", key2); box.hidden = true; box.innerHTML = ""; try { if (MB3.BGM) MB3.BGM.play(prevBgm && prevBgm !== "story" ? prevBgm : (UI.cur() && UI.S[UI.cur().name] && UI.S[UI.cur().name].bgm) || "menu"); } catch (e) {} if (cb) cb(); };
    const setHide = (v) => { hideBox = v; box.classList.toggle("hidebox", v); };
    const key2 = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (hideBox) { e.preventDefault(); e.stopPropagation(); setHide(false); return; }
      if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowRight" || e.code === "NumpadEnter") { e.preventDefault(); e.stopPropagation(); next(); }
      else if (e.code === "Escape") { e.preventDefault(); e.stopPropagation(); done(); }
      else if (e.code === "KeyA") { e.preventDefault(); const b = $("#stAuto", box); if (b) b.click(); }
      else if (e.code === "KeyH") { e.preventDefault(); setHide(true); }
    };
    window.addEventListener("keydown", key2);
    const show = () => {
      if (i >= lines.length) { done(); return; }
      const [who, txt, pic] = lines[i];
      const isChr = who && ST().KITS[who];
      $("#stNm", box).textContent = isChr ? UI.nm(who) : (D().SPEAKER[who] || "");
      $("#stNm", box).style.display = who ? "" : "none";
      $("#stNm", box).style.setProperty("--cc", isChr ? (UI.CCOL[who] || "#7b5cff") : who === "sys" ? "#12b5ff" : "#5a6390");
      const p = pic === "-" ? null : (pic || (isChr ? who : null));
      /* ★★ 2026-10-31 ご指定「LD 画像があるキャラは LD の方で」→ 全身の立ち絵（大きく・下から）。ない子は縦長の絵の札 */
      const chr = $("#stChr", box);
      if (chr.dataset.p !== (p || "")) {
        chr.dataset.p = p || "";
        chr.className = "st-chr" + (p && UI.hasLD(p) ? " ld" : p ? " card" : "");
        chr.innerHTML = !p ? "" : UI.hasLD(p) ? '<img class="st-ld" src="' + UI.ld(p) + '" alt="" onerror="this.src=\'' + UI.ss(p) + '\'">' : '<div class="st-card"><img src="' + UI.ss(p) + '" alt="" onerror="this.src=\'' + UI.art(p) + '\'"></div>';
        void chr.offsetWidth; if (p) chr.classList.add("in");
      }
      const tx = $("#stTx", box); tx.classList.toggle("narr", !who || who === "cmd");
      full = txt; let n = 0; clearInterval(typing);
      typing = setInterval(() => { n += 2; tx.textContent = full.slice(0, n); if (n >= full.length) { clearInterval(typing); typing = 0; if (auto) autoT = setTimeout(next, 1500); } }, 24);
    };
    const next = () => { clearTimeout(autoT); if (typing) { clearInterval(typing); typing = 0; $("#stTx", box).textContent = full; if (auto) autoT = setTimeout(next, 1300); return; } i++; show(); };
    box.onclick = (e) => { if (hideBox) { setHide(false); return; } if (e.target.closest(".st-ctl")) return; next(); };
    $("#stSkip", box).onclick = (e) => { e.stopPropagation(); done(); };
    $("#stHide", box).onclick = (e) => { e.stopPropagation(); setHide(true); };
    $("#stAuto", box).onclick = (e) => { e.stopPropagation(); auto = !auto; e.currentTarget.classList.toggle("on", auto); if (auto && !typing) autoT = setTimeout(next, 600); };
    show();
  };

  /* ══════════ ストーリーのアーカイブ ══════════ */
  UI.S.story = {
    top: true, nav: false, title: "ストーリー", en: "ARCHIVE", back: "lobby",
    render() {
      const L = D().STORY_LIST;
      /* 見た話＋その面をもうクリアしている章の話（★ あとから足した「まんなか」も、4面をクリアずみなら見られる） */
      const seen = (k) => { if (SV().seen(k)) return true; const m = /^c(\d)([amb])$/.exec(k); return !!m && !!SV().cleared(m[1] + "-" + { a: 1, m: 4, b: 8 }[m[2]], false); };
      const nS = L.reduce((a, g) => a + g.ks.filter(seen).length, 0), nA = L.reduce((a, g) => a + g.ks.length, 0);
      const own = SV().ownedIds();
      return '<div class="wrap"><div class="pgh"><b>ストーリー</b><span class="pgh-c">見たストーリー <b>' + nS + "</b> / " + nA + "</span></div>" +
        '<p class="muted" style="margin-top:0">キャンペーンで見たストーリーを、いつでも見返せます。まだ見ていない話は、その章を進めると開きます。</p>' +
        L.map((g, gi) => '<div class="arch"><div class="arch-h" style="--c:' + (gi ? D().CHAPTERS[gi - 1].c : "#7b5cff") + '"><b>' + esc(g.g) + "</b><small>" + g.ks.filter(seen).length + "/" + g.ks.length + "</small></div>" +
          g.ks.map((k) => { const s = D().STORY[k], ok = seen(k); const kind = /a$/.test(k) ? "はじまり" : /m$/.test(k) ? "まんなか" : /b$/.test(k) ? "クリア" : "プロローグ"; return '<button class="arch-i' + (ok ? "" : " lk") + '" data-k="' + k + '"' + (ok ? "" : " disabled") + '><span class="ak">' + kind + "</span><b>" + (ok ? esc(s.t) : "？？？") + "</b><em>" + (ok ? "▶ 見る" : "🔒 " + (/m$/.test(k) ? "4面の前で開く" : /b$/.test(k) ? "ボスを倒すと開く" : "章をはじめると開く")) + "</em></button>"; }).join("") + "</div>").join("") +
        '<div class="h2"><b>キャラのエピソード</b><em>好感度 5・' + D().EP2_NEED + ' で開く</em></div><div class="eplist">' +
        ST().IDS.map((id) => { const o = own.indexOf(id) >= 0, b = o ? SV().unit(id).bond : 0; return '<div class="epc' + (o ? "" : " lk") + (UI.isMax(id) ? " mx" : "") + '"><img src="' + UI.th(id) + '" alt=""><span><b>' + esc(UI.nm(id)) + "</b><small>好感度 " + b + "</small></span>" +
          '<button class="btn sm" data-ep="1" data-id="' + id + '" ' + (o && b >= 5 ? "" : "disabled") + '>第1話</button><button class="btn sm" data-ep="2" data-id="' + id + '" ' + (o && b >= D().EP2_NEED ? "" : "disabled") + ">第2話</button></div>"; }).join("") + "</div></div>";
    },
    mount(el) {
      $$(".arch-i:not(.lk)", el).forEach((b) => (b.onclick = () => { UI.click(); UI.story(b.dataset.k, () => UI.refresh()); }));
      $$("[data-ep]", el).forEach((b) => (b.onclick = () => { UI.click(); const id = b.dataset.id, two = b.dataset.ep === "2"; const ep = (two ? D().EPISODE2 : D().EPISODE)[id]; if (ep) UI.storyLines(UI.nm(id) + (two ? "と、これから" : "のこと"), ep[0], ep.slice(1).map((x) => [id, x]), () => UI.refresh(), (two ? "ep2:" : "ep1:") + id); }));
    },
  };

  /* ══════════ キャンペーン ══════════ */
  const camp = { c: 0, hard: false };
  UI.S.camp = {
    top: true, nav: false, title: "キャンペーン", en: "CAMPAIGN", back: "lobby",
    render() {
      if (!camp.c) camp.c = SV().nextStage().c;
      const chs = D().CHAPTERS;
      const cards = chs.map((ch) => {
        const n = [1, 2, 3, 4, 5, 6, 7, 8].filter((s) => SV().cleared(ch.n + "-" + s, camp.hard)).length;
        const lock = !SV().unlocked(ch.n, 1, camp.hard);
        return '<button class="chap' + (camp.c === ch.n ? " on" : "") + (lock ? " lock" : "") + '" data-c="' + ch.n + '" style="--cc:' + ch.c + '"><canvas data-bg="' + ch.bg + '"></canvas><span class="ci"><small>CHAPTER ' + ch.n + "</small><b>" + esc(ch.nm) + '</b></span><span class="prog">' + (lock ? "🔒" : n + "/8") + '</span><span class="pbar"><i style="width:' + (n / 8 * 100) + '%"></i></span></button>';
      }).join("");
      const ch = chs[camp.c - 1];
      const nodes = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
        const id = ch.n + "-" + s, st = SV().cleared(id, camp.hard), lock = !SV().unlocked(ch.n, s, camp.hard);
        const nx = !st && !lock;
        const L = D().stageLevel(ch.n, s, camp.hard);
        const nw = s === 8 ? "3+ボス" : s <= 2 ? 3 : s <= 5 ? 4 : 5;
        return '<button class="snode' + (s === 8 ? " boss" : s === 4 ? " elite" : "") + (lock ? " lock" : "") + (nx ? " cur" : "") + (st ? " done" : "") + '" data-s="' + s + '" style="--cc:' + ch.c + '"><span class="no">' + (s === 8 ? "BOSS" : (camp.hard ? "H" : "") + ch.n + "-" + s) + "</span>" +
          "<span><b>" + (s === 8 ? esc(D().BOSSES[ch.boss].nm) : s === 4 ? "強敵出現" : "ステージ " + s) + "</b><small>敵 Lv." + L + "・" + nw + " WAVE・推奨 " + short(D().recPower(L)) + "</small></span>" +
          '<span class="st3">' + [1, 2, 3].map((k) => (k <= st ? "★" : "<i>★</i>")).join("") + "</span></button>";
      }).join("");
      return '<div class="wrap"><div class="seg nh"><button class="' + (camp.hard ? "" : "on") + '" data-h="0">NORMAL</button><button class="' + (camp.hard ? "on" : "") + '" data-h="1">HARD</button></div>' +
        '<div class="chaps">' + cards + "</div>" +
        '<div class="pgh" style="--c:' + ch.c + '"><b>第' + ch.n + "章 " + esc(ch.nm) + '</b><span class="pgh-c">部隊の戦力 <b>' + short(SV().teamPower(SV().teamOf(SV().squad()))) + "</b></span></div>" +
        '<div class="smap">' + nodes + "</div>" +
        (camp.hard ? '<p class="muted">HARD は各章のボスを NORMAL で倒すと開きます。敵が強いぶん、装備のランクとごほうびが上がります。</p>' : "") + "</div>";
    },
    mount(el) {
      $$("[data-h]", el).forEach((b) => (b.onclick = () => { UI.click(); camp.hard = b.dataset.h === "1"; UI.refresh(); }));
      $$(".chap", el).forEach((b) => (b.onclick = () => { if (b.classList.contains("lock")) { UI.toast("前の章のボスを倒すと開きます"); return; } UI.click(); camp.c = +b.dataset.c; UI.refresh(); }));
      $$(".chap canvas", el).forEach((c) => { try { const src = MB3.Spr.bg(c.dataset.bg, 130, 60, 0.6); c.width = 130; c.height = 60; c.getContext("2d").drawImage(src, 0, 0); } catch (e) {} });
      const on = $(".chap.on", el); if (on) on.scrollIntoView({ inline: "center", block: "nearest" });
      $$(".snode", el).forEach((b) => (b.onclick = () => { if (b.classList.contains("lock")) { UI.toast("前のステージをクリアすると開きます"); return; } UI.click(); stageSheet(camp.c, +b.dataset.s, camp.hard); }));
    },
  };
  function stageRewards(st, first) {
    const L = st.L, c = st.c || Math.ceil((st.f || 1) / 16);
    const rw = { credit: 800 * L + 3000, bdata: 220 * L + 800 };
    if (first) { rw.gem = (st.s === 8 ? 12 : st.s === 4 ? 4 : 2) * (st.hard ? 2 : 1); rw.manual1 = 2 + c; if (c >= 3) rw.manual2 = c - 2; }
    return rw;
  }
  function stageSheet(c, s, hard) {
    const st = D().buildStage(c, s, hard), rec = D().recPower(st.L);
    const first = !SV().cleared(st.id, hard);
    const pool = {}; st.waves.forEach((w) => w.forEach((x) => { const k = x.boss ? "boss:" + x.boss : x.k; pool[k] = 1; }));
    const enemies = Object.keys(pool).map((k) => (k.indexOf("boss:") === 0 ? '<span class="ech boss">' + esc(D().BOSSES[k.slice(5)].nm) + "</span>" : '<span class="ech" title="' + esc(D().ENEMIES[k].d || "") + '">' + esc(D().ENEMIES[k].nm) + "</span>")).join("");
    const rw = stageRewards(st, first), tierLo = Math.min(9, c + (hard ? 2 : 0));
    const team = SV().teamOf(SV().squad()), pw = SV().teamPower(team);
    const list = Object.keys(rw).map((k) => [k === "gem" ? "ジェム" : D().ITEMS[k].nm, rw[k], k]);
    const tips = Object.keys(pool).filter((k) => D().ENEMIES[k] && D().ENEMIES[k].d).map((k) => "<li><b>" + esc(D().ENEMIES[k].nm) + "</b>：" + esc(D().ENEMIES[k].d) + "</li>").join("");
    UI.sheet('<div class="sh-h"><span class="sh-ic">' + (s === 8 ? "👑" : s === 4 ? "⚠" : "▶") + '</span><b>' + esc(st.nm) + "　" + esc(st.title) + '</b><button class="sh-x" data-x aria-label="閉じる">✕</button></div>' +
      '<div class="pan"><div class="tpw" style="margin:0"><span><small class="muted">推奨戦力</small><b class="num">' + fmt(rec) + '</b></span><span class="rec ' + (pw < rec * 0.85 ? "ng" : "ok") + '">部隊 ' + fmt(pw) + "</span></div>" +
      '<div class="muted">敵 Lv.' + st.L + "・<b>" + st.waves.length + " WAVE</b>・制限時間 4:00</div><div class=\"echs\">" + enemies + "</div>" + (tips ? '<ul class="tips">' + tips + "</ul>" : "") + "</div>" +
      '<div class="h2"><b>' + (first ? "はじめてクリア" : "クリアのたび") + "</b><em>装備 T" + Math.max(1, tierLo - 1) + "〜T" + tierLo + " が出ることがあります</em></div>" + UI.rwHTML(list) +
      '<p class="muted">★3：だれも倒れず 2分30秒以内／★2：だれも倒れずにクリア／★1：クリア</p>' +
      '<div class="sh-btns"><button class="btn big wide" id="sGo">編成して出撃</button></div>',
      (el) => { $("#sGo", el).onclick = () => { UI.click(); UI.closeSheet(); goStage(st); }; });
  }
  function goStage(st) {
    if (!SV().ownedIds().length) { UI.toast("持っている超極祭系の UR がいません（ガチャで手に入れると出撃できます）"); return; }
    const run = () => UI.go("form", { mode: "stage", stage: st, rec: D().recPower(st.L), title: st.nm + "　" + st.title, onGo: (ids) => startStage(st, ids) });
    const key = "c" + st.c + (st.s === 1 ? "a" : st.s === 4 ? "m" : "");
    if (!st.hard && (st.s === 1 || st.s === 4) && !SV().seen(key) && D().STORY[key]) UI.story(key, run);
    else run();
  }
  function startStage(st, ids) {
    const team = SV().teamOf(ids);
    if (!team.length) { UI.toast("編成にキャラを入れてください"); return; }
    UI.battle({ mode: "stage", stage: st, team, title: st.nm + " " + st.title, bg: st.bg }, (B) => UI.go("result", { B, kind: "stage", st, ids }, { replace: true }));
  }

  /* ══════════ 結果 ══════════ */
  function gearTier(st) { const c = st.c || 1; return Math.max(1, Math.min(9, c + (st.hard ? 2 : 0) - (Math.random() < 0.5 ? 1 : 0))); }
  function processResult(p) {
    if (p.done) return; p.done = true;
    const B = p.B, us = B.side[0].units, win = B.result === "win";
    const dead = us.filter((u) => u.dead).length;
    p.stars = win ? (dead === 0 && B.t <= D().STAR3_T ? 3 : dead === 0 ? 2 : 1) : 0;
    p.got = [];
    if (p.kind === "stage" && win) {
      const first = SV().setClear(p.st.id, p.st.hard, p.stars);
      p.first = first;
      const rw = stageRewards(p.st, first);
      if (Math.random() < 0.4 + (first ? 0.3 : 0)) rw.gear = gearTier(p.st);
      p.got = SV().give(rw, "キャンペーン " + p.st.id);
      if (first && p.st.s === 8 && !p.st.hard) p.outro = "c" + p.st.c + "b";
    }
    if (p.kind === "tower" && win) {
      const f = p.st.f, first = f > SV().S.tower.floor;
      if (first) {
        SV().S.tower.floor = f;
        const rw = { credit: 6000 + 1200 * f, bdata: 1800 + 360 * f };
        if (f % 5 === 0) { rw.shard = 3; rw.kit = 3; }
        if (f % 10 === 0) { rw.gem = 10; rw.cube = 1; rw.module = 1; rw.gear = Math.min(9, 4 + f / 10 | 0); }
        p.got = SV().give(rw, "タワー " + f + "階");
      } else p.got = SV().give({ credit: 2000 + 300 * f }, "タワー");
      p.first = first;
      SV().save();
    }
    if (p.kind === "boss") {
      const dmg = Math.round(B.dmgTotal), S = SV().S;
      const ym = SV().month();
      if (S.icpt.bestYm !== ym) { S.icpt.bestYm = ym; S.icpt.best = 0; }
      p.newBest = dmg > S.icpt.best; S.icpt.best = Math.max(S.icpt.best, dmg); S.icpt.dayBest = Math.max(S.icpt.dayBest | 0, dmg);
      let tier = D().INTERCEPT_TIERS[0]; D().INTERCEPT_TIERS.forEach((t) => { if (dmg >= t.dmg) tier = t; });
      p.tier = tier; p.dmg = dmg;
      const rw = Object.assign({}, tier.rw); if (B.result === "win") rw.gem = 3;
      p.got = SV().give(rw, "迎撃戦（" + tier.nm + "）");
      if (Math.random() < 0.08 + D().INTERCEPT_TIERS.indexOf(tier) * 0.03) p.got = p.got.concat(SV().give({ cube: 1 }, "迎撃戦"));
      SV().track("intercept", 1); SV().save();
      try { if (NET()) NET().submitScore(S.icpt.best); } catch (e) {}
    }
    if (p.kind === "arena") arenaAfter(p);
    p.mvp = us.slice().sort((a, b) => b.dmg - a.dmg)[0];
  }
  /* ★★ 2026-10-31 結果を閉じたら、その前の画面へ（結果は戻る先に積まない） */
  const RESULT_BACK = { stage: "camp", tower: "tower", arena: "arena", boss: "icpt" };
  UI.S.result = {
    top: false, nav: false, cls: "resscr", back: (p) => RESULT_BACK[p.kind] || "lobby",
    render(p) {
      processResult(p);
      const B = p.B, win = B.result === "win", us = B.side[0].units, maxD = Math.max(1, ...us.map((u) => u.dmg));
      const head = p.kind === "boss" ? '<div class="res-h boss">' + short(p.dmg) + '</div><div class="res-sub">与えたダメージ' + (p.newBest ? "（今月の最高！）" : "") + '・段位 <b class="tier">' + p.tier.nm + "</b></div>"
        : '<div class="res-h ' + (win ? "win" : "lose") + '">' + (win ? "VICTORY" : B.result === "retreat" ? "RETREAT" : "DEFEAT") + "</div>" + (p.kind === "stage" || p.kind === "tower" ? '<div class="res-stars">' + [1, 2, 3].map((k) => (k <= p.stars ? "<b>★</b>" : "<i>★</i>")).join("") + "</div>" : "");
      const arena = p.kind === "arena" ? '<div class="res-arena ' + (p.delta >= 0 ? "up" : "down") + '"><b class="num">' + (p.delta >= 0 ? "+" : "") + p.delta + '</b><small>アリーナポイント ' + fmt(SV().S.arena.pts) + "</small></div>" : "";
      const nextBtn = p.kind === "stage" && win ? nextStageOf(p.st) : null;
      const info = '<div class="res-info"><span>撃破 <b>' + B.kills + "</b></span><span>最大コンボ <b>" + (B.combo.best || 0) + "</b></span><span>時間 <b>" + Math.floor(B.t / 60) + ":" + String(Math.floor(B.t % 60)).padStart(2, "0") + "</b></span></div>";
      return '<button class="res-x" id="rX" aria-label="閉じる">✕</button><div class="res">' + head + arena + info +
        (p.mvp ? '<div class="res-mvp' + (UI.isMax(p.mvp.id) ? " mx" : "") + '"><img src="' + UI.wide(p.mvp.id) + '" alt="" onerror="this.src=\'' + UI.art(p.mvp.id) + '\'"><span class="mvpb">MVP</span><span class="mvpn">' + esc(UI.nm(p.mvp.id)) + "</span></div>" : "") +
        '<div class="dmgs">' + us.map((u) => '<div class="dmg"><img src="' + UI.th(u.id) + '" alt=""><div class="bar"><b style="width:' + (u.dmg / maxD * 100) + "%;background:" + (UI.CCOL[u.id] || "#7b5cff") + '"></b></div><em>' + short(u.dmg) + "</em></div>").join("") + "</div>" +
        (p.got && p.got.length ? '<div class="h2" style="width:min(92vw,560px)"><b>' + (p.first ? "はじめてのクリア！" : "ごほうび") + "</b></div>" + UI.rwHTML(p.got) : "") +
        '<div class="sh-btns res-btns">' +
        (p.kind === "stage" || p.kind === "tower" ? '<button class="btn ghost" id="rAgain">もう一度</button>' : "") +
        (nextBtn ? '<button class="btn" id="rNext">次へ ' + nextBtn.c + "-" + nextBtn.s + "</button>" : p.kind === "tower" && win ? '<button class="btn" id="rNextT">次の階へ</button>' : "") +
        '<button class="btn ' + (nextBtn || (p.kind === "tower" && win) ? "ghost" : "") + '" id="rBack">閉じる</button></div></div>';
    },
    mount(el, p) {
      const close = () => { UI.click(); const go = () => UI.go(RESULT_BACK[p.kind] || "lobby", {}, { noPush: true }); if (p.outro) { const k = p.outro; p.outro = null; UI.story(k, go); } else go(); };
      $("#rBack", el).onclick = close; $("#rX", el).onclick = close;
      const ag = $("#rAgain", el); if (ag) ag.onclick = () => { UI.click(); if (p.kind === "tower") startTower(p.st.f, p.ids); else startStage(p.st, p.ids); };
      const nx = $("#rNext", el); if (nx) nx.onclick = () => { UI.click(); const n = nextStageOf(p.st); const go = () => { const st = D().buildStage(n.c, n.s, p.st.hard); camp.c = n.c; goStage(st); }; if (p.outro) { const k = p.outro; p.outro = null; UI.story(k, go); } else go(); };
      const nt = $("#rNextT", el); if (nt) nt.onclick = () => { UI.click(); startTower(SV().S.tower.floor + 1, p.ids); };
      UI.paintCur();
      try { MB3.BGM && MB3.BGM.play("menu"); } catch (e) {}
    },
  };
  function nextStageOf(st) {
    if (!st || st.kind !== "stage") return null;
    let c = st.c, s = st.s + 1; if (s > 8) { c++; s = 1; } if (c > 6) return null;
    return SV().unlocked(c, s, st.hard) ? { c, s } : null;
  }

  /* ══════════ アリーナ ══════════ */
  let arenaPool = null, arenaLoading = false, arenaLogs = null;
  function compact(o) { const g = {}; Object.keys(o.gear || {}).forEach((p) => { const x = o.gear[p]; g[p] = { t: x.t, e: x.e, cls: x.cls, sq: x.sq, ol: (x.ol || []).map((y) => ({ k: y.k, v: y.v })) }; }); return { id: o.id, lv: o.lv, awk: o.awk, sk: o.sk, bond: o.bond, res: o.res, gear: g, cube: o.cube }; }
  function arenaSeason() {
    const S = SV().S, m = SV().month();
    if (S.arena.season !== m) {
      const old = S.arena.season, t = D().arenaTier(S.arena.pts);
      if (!S.arena.claimed[old]) {
        S.arena.claimed[old] = 1;
        const got = SV().give({ gem: t.gem, acoin: t.coin }, "アリーナ " + old + " シーズン（" + t.nm + "）");
        setTimeout(() => UI.rewardSheet("シーズン " + old + " のごほうび（" + t.nm + "）", got), 300);
      }
      S.arena.season = m; S.arena.pts = Math.round(1000 + (S.arena.pts - 1000) * 0.5); S.arena.w = 0; S.arena.l = 0; S.arena.opps = [];
      SV().save();
    }
  }
  function npcTeam(seed, pts) {
    const R = D().rng(seed), ids = ST().IDS.slice().sort(() => R() - 0.5).slice(0, 5);
    const mine = SV().ownedIds().map((x) => SV().effLv(x)).sort((a, b) => b - a).slice(0, 5);
    const base = mine.length ? mine.reduce((a, b) => a + b, 0) / mine.length : 20;
    const lv = Math.max(5, Math.min(200, Math.round(base * (0.8 + (pts - 900) / 1600) + (R() - 0.5) * 10)));
    return ids.map((id) => ({ id, lv, awk: Math.min(4, Math.floor(lv / 45)), sk: [1, 2, 3].map(() => Math.min(10, 1 + Math.floor(lv / 22 + R() * 2))), bond: Math.min(30, Math.floor(lv / 8)), res: Math.floor(lv / 6), gear: {}, cube: null }));
  }
  function pickOpps(force) {
    const S = SV().S, me = NET() ? NET().acct().uid : "";
    if (!force && S.arena.opps && S.arena.opps.length === 3) return;
    const pts = S.arena.pts, out = [];
    const real = (arenaPool || []).filter((x) => x.uid !== me).map((x) => ({ real: 1, uid: x.uid, name: x.name, charFile: x.charFile, pts: x.pts || 1000, team: x.team, pw: x.pw || 0 }));
    real.sort((a, b) => Math.abs(a.pts - pts) - Math.abs(b.pts - pts));
    real.slice(0, 8).sort(() => Math.random() - 0.5).slice(0, 2).forEach((x) => out.push(x));
    let k = 0;
    while (out.length < 3) {
      const nm = D().NPC_NAMES[(Date.now() / 1000 + k * 7) % D().NPC_NAMES.length | 0];
      const op = pts + Math.round((Math.random() - 0.45) * 160);
      const team = npcTeam("npc:" + Date.now() + ":" + k, op);
      out.push({ real: 0, uid: "npc" + k, name: nm, pts: op, team, pw: SV().teamPower(team.map((m) => m)) });
      k++;
    }
    out.forEach((o) => { if (!o.pw) o.pw = SV().teamPower(o.team); });
    S.arena.opps = out.slice(0, 3); SV().save();
  }
  async function loadArena() {
    if (arenaLoading || !NET()) return;
    arenaLoading = true;
    const S = SV().S;
    const list = await NET().listArena(S.arena.season);
    arenaPool = list || [];
    const logs = await NET().readLogs();
    if (logs) {
      arenaLogs = logs;
      const fresh = logs.filter((x) => (x.at || 0) > (S.arena.logAt || 0));
      if (fresh.length) { const d = fresh.reduce((a, x) => a + (x.delta | 0), 0); S.arena.pts = Math.max(0, S.arena.pts + d); S.arena.logAt = Math.max(...fresh.map((x) => x.at || 0)); SV().save(); }
    }
    arenaLoading = false;
    if (UI.cur() && UI.cur().name === "arena") UI.refresh();
  }
  function submitDef() {
    const S = SV().S; const ids = (S.defense || []).filter((id) => SV().owned(id));
    if (!ids.length || !NET()) return;
    const team = ids.map((id) => compact(SV().opt(id)));
    NET().submitDefense(S.arena.season, { pts: S.arena.pts, team, pw: SV().teamPower(ids.map((id) => SV().opt(id))) });
  }
  UI.S.arena = {
    top: true, nav: true, title: "アリーナ", en: "ROOKIE ARENA", back: "lobby", cur: ["acoin", "credit", "gem"], bgm: "arena",
    render() {
      arenaSeason();
      const S = SV().S, t = D().arenaTier(S.arena.pts), left = D().ARENA_TRIES - (S.arena.tries | 0);
      pickOpps(false);
      if (arenaPool == null && !arenaLoading) loadArena();
      const now = new Date(), end = new Date(now.getFullYear(), now.getMonth() + 1, 1), days = Math.ceil((end - now) / 86400000);
      const def = (S.defense || []).filter((id) => SV().owned(id));
      const dayOk = S.arena.dayClaim !== SV().today();
      const ti = D().ARENA_TIERS.indexOf(t), nt = D().ARENA_TIERS[ti + 1];
      const prog = nt ? Math.max(0, Math.min(1, (S.arena.pts - t.pts) / (nt.pts - t.pts))) : 1;
      return '<div class="wrap"><div class="ar-hero" style="--tc:' + t.c + '"><div class="ar-badge"><span>' + t.nm + "</span></div><div class=\"ar-main\"><small>シーズン " + S.arena.season + "・のこり " + days + "日</small><b class=\"num\">" + fmt(S.arena.pts) + "<em>pt</em></b>" +
        '<div class="ar-prog"><i style="width:' + Math.round(prog * 100) + '%"></i></div><small>' + (nt ? "次の " + nt.nm + " まで " + (nt.pts - S.arena.pts) + " pt" : "最上位の段位です") + "</small></div>" +
        '<div class="ar-rec"><span class="w"><b>' + S.arena.w + "</b>勝</span><span class=\"l\"><b>" + S.arena.l + "</b>敗</span><span class=\"t\">きょう あと <b>" + Math.max(0, left) + "</b> 回</span></div></div>" +
        '<div class="ar-btns"><button class="btn gold" id="aDay" ' + (dayOk ? "" : "disabled") + '>✪ きょうのコイン' + (dayOk ? "" : "（受取ずみ）") + '</button><button class="btn ghost" id="aShop">アリーナショップ</button></div>' +
        '<div class="h2"><b>対戦相手</b><em>' + (arenaLoading ? "読みこみ中…" : '<button class="btn sm ghost" id="aRef">入れかえ</button>') + "</em></div><div class=\"opps\">" +
        S.arena.opps.map((o, i) => { const tt = D().arenaTier(o.pts || 1000); return '<div class="opp" style="--tc:' + tt.c + '"><span class="av">' + (o.charFile ? '<img src="../chars/' + esc(o.charFile) + '" alt="" onerror="this.src=\'' + UI.th((o.team[0] && o.team[0].id) || "haru") + '\'">' : '<img src="' + UI.th((o.team[0] && o.team[0].id) || "haru") + '" alt="">') + "</span>" +
          '<span class="oi"><b>' + esc(o.name) + (o.real ? "" : ' <small class="npc">NPC</small>') + '</b><small><i class="tdot"></i>' + tt.nm + "・" + fmt(o.pts) + " pt・戦力 " + short(o.pw) + '</small><div class="team">' + (o.team || []).map((m) => '<img src="' + UI.th(m.id) + '" alt="">').join("") + "</div></span>" +
          '<button class="btn sm red" data-fight="' + i + '" ' + (left > 0 ? "" : "disabled") + ">挑戦</button></div>"; }).join("") + "</div>" +
        '<div class="h2"><b>防衛編成</b><em>' + (def.length ? "戦力 " + short(SV().teamPower(def.map((id) => SV().opt(id)))) : "未登録") + '</em></div>' +
        '<div class="pan defp">' + (def.length ? '<div class="team big">' + def.map((id) => '<img src="' + UI.th(id) + '" alt="">').join("") + "</div>" : '<span class="muted" style="flex:1">ほかの指揮官があなたに挑むときの5人です</span>') + '<button class="btn sm" id="aDef">編集</button></div>' +
        '<div class="h2"><b>防衛の記録</b></div><div class="logs">' + ((arenaLogs || []).slice(0, 8).map((x) => '<div class="' + (x.delta >= 0 ? "w" : "l") + '"><span>' + esc(x.name || "?") + " が挑戦 → " + (x.delta >= 0 ? "防衛成功" : "防衛失敗") + "</span><em>" + (x.delta >= 0 ? "+" : "") + (x.delta | 0) + "</em></div>").join("") || '<div class="none">まだ記録はありません</div>') + "</div>" +
        '<div class="h2"><b>シーズンのごほうび</b><em>毎月1日に前のシーズンの段位で</em></div><div class="tierlist">' + D().ARENA_TIERS.map((x) => '<div class="' + (x === t ? "on" : "") + '" style="--tc:' + x.c + '"><b>' + x.nm + "</b><small>" + x.pts + ' pt〜</small><span><img src="../gem.png" alt="">' + x.gem + "　✪" + x.coin + "</span></div>").join("") + "</div>" +
        '<p class="muted">相手の防衛編成はほかの指揮官が登録したもの（いないときは NPC）。5対5の<b>自動戦</b>（撃つのもバーストも自動）。90秒で決着しないときは残りの HP の多いほうが勝ち。</p></div>';
    },
    mount(el) {
      const S = SV().S;
      $("#aDef", el).onclick = () => { UI.click(); UI.go("form", { mode: "defense", ids: (S.defense || []).filter((id) => SV().owned(id)), onGo: (ids) => { S.defense = ids; SV().save(); submitDef(); UI.toast("防衛編成を登録しました"); UI.back(); } }); };
      const rf = $("#aRef", el); if (rf) rf.onclick = () => { UI.click(); pickOpps(true); UI.refresh(); };
      const dy = $("#aDay", el); if (dy) dy.onclick = () => { const t = D().arenaTier(S.arena.pts); S.arena.dayClaim = SV().today(); const got = SV().give({ acoin: Math.round(t.coin / 10) + 30 }, "アリーナ"); SV().save(); UI.rewardSheet("きょうのアリーナコイン", got); UI.refresh(); UI.paintCur(); };
      $("#aShop", el).onclick = () => { UI.click(); shopTab = "arena"; UI.go("shop"); };
      $$("[data-fight]", el).forEach((b) => (b.onclick = () => {
        const o = S.arena.opps[+b.dataset.fight]; if (!o) return;
        if (!SV().ownedIds().length) { UI.toast("アリーナには持っているキャラが必要です"); return; }
        UI.click();
        UI.go("form", { mode: "arena", title: "VS " + o.name, rec: o.pw, onGo: (ids) => {
          const team = SV().teamOf(ids); if (!team.length) { UI.toast("持っているキャラを入れてください"); return; }
          S.arena.tries = (S.arena.tries | 0) + 1; SV().save();
          UI.battle({ mode: "arena", team, foe: o.team, foeName: o.name, title: "ROOKIE ARENA", bg: "void" }, (B) => UI.go("result", { B, kind: "arena", opp: o, ids }, { replace: true }));
        } });
      }));
    },
  };
  function arenaAfter(p) {
    const S = SV().S, o = p.opp, win = p.B.result === "win";
    const diff = (o.pts || 1000) - S.arena.pts;
    const delta = win ? Math.round(20 + Math.max(-10, Math.min(15, diff / 25))) : -Math.round(12 + Math.max(-5, Math.min(8, -diff / 40)));
    p.delta = delta;
    S.arena.pts = Math.max(0, S.arena.pts + delta);
    if (win) S.arena.w++; else S.arena.l++;
    p.got = SV().give({ acoin: win ? 40 : 15, credit: win ? 8000 : 3000 }, "アリーナ");
    SV().track("arena", 1);
    S.arena.opps = S.arena.opps.filter((x) => x !== o && x.uid !== o.uid);
    SV().save();
    if (o.real && NET()) { const a = NET().acct(); NET().pushLog(o.uid, { name: a.name, uid: a.uid, delta: win ? -14 : 8 }); }
    submitDef();
  }

  /* ══════════ 迎撃戦 ══════════ */
  let icRank = null, icLoading = false, icClaimTried = false;
  function icL() { return Math.round(Math.min(95, 18 + SV().progress() * 1.25 + SV().S.tower.floor * 0.25)); }
  UI.S.icpt = {
    top: true, nav: false, title: "迎撃戦", en: "INTERCEPTION", back: "lobby",
    render() {
      const S = SV().S, T = D().interceptToday(), bd = D().BOSSES[T.boss], left = D().INTERCEPT_TRIES - (S.icpt.tries | 0), E = ST().ELEM[T.weak];
      if (S.icpt.bestYm !== SV().month()) { S.icpt.bestYm = SV().month(); S.icpt.best = 0; SV().save(); }
      if (!icRank && !icLoading && NET()) { icLoading = true; NET().getRanking().then((r) => { icRank = r || []; icLoading = false; if (UI.cur() && UI.cur().name === "icpt") UI.refresh(); }); }
      if (!icClaimTried && NET()) { icClaimTried = true; NET().claimPrevReward().then((r) => { if (r && r.ok) UI.rewardSheet("迎撃戦 " + r.ym + " の " + r.rank + "位", [["ジェム", r.amount, "gem"]]); }); }
      const me = NET() ? NET().acct().uid : "";
      const moves = bd.pat.filter((x, i, a) => a.indexOf(x) === i).map((k) => '<span class="ech" title="' + esc((D().BOSS_MOVES[k] || {}).d || "") + '">' + esc((D().BOSS_MOVES[k] || { nm: k }).nm) + "</span>").join("");
      return '<div class="wrap"><div class="boss-hero"><canvas id="icCv"></canvas><div class="bi"><small>' + esc(bd.code) + "</small><b>" + esc(T.nm) + '</b></div><span class="weak" style="background:' + E.c + '">弱点 ' + E.nm + "</span></div>" +
        '<div class="pan" style="margin-top:10px"><div class="icrow"><span>弱点の属性で与ダメージ <b>+25%</b></span><span class="tries">のこり <b class="num">' + Math.max(0, left) + "</b> / " + D().INTERCEPT_TRIES + "</span></div>" +
        '<div class="muted">ボス Lv.' + icL() + "・制限時間 3:00。倒すことより<b>与えたダメージ</b>がスコア。きょうの最高 " + short(S.icpt.dayBest | 0) + "・今月の最高 " + short(S.icpt.best | 0) + '</div><div class="echs">' + moves + "</div>" +
        '<button class="btn big wide" id="icGo" style="margin-top:10px" ' + (left > 0 ? "" : "disabled") + ">編成して迎撃</button></div>" +
        '<div class="h2"><b>ダメージの段とごほうび</b></div><div class="tiers">' + D().INTERCEPT_TIERS.map((t) => '<span class="' + ((S.icpt.dayBest | 0) >= t.dmg ? "on" : "") + '"><b>' + t.nm + "</b>" + short(t.dmg) + "</span>").join("") + "</div>" +
        '<p class="muted">S 以上でオーバーロード核・カスタムモジュール、B 以上で T7〜T9 の装備。ときどきキューブも。ボスは毎日かわります。</p>' +
        '<div class="h2"><b>今月のランキング</b><em>先月の1〜10位に 💎ジェム</em></div><div class="logs">' +
        (icRank == null ? "<div>読みこみ中…</div>" : icRank.length ? icRank.slice(0, 10).map((r, i) => '<div class="' + (r.uid === me ? "w" : "") + '"><span>' + (i + 1) + "位　" + esc(r.name) + "</span><em>" + short(r.score) + "</em></div>").join("") : '<div class="none">まだ記録がありません</div>') + "</div></div>";
    },
    mount(el) {
      const T = D().interceptToday();
      try { const c = $("#icCv", el), r = c.getBoundingClientRect(); const lw = 200, lh = Math.round(200 * r.height / Math.max(1, r.width)); c.width = lw; c.height = lh; const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(MB3.Spr.bg(T.bg, lw, lh, 0.62), 0, 0); const sp = MB3.Spr.boss(T.boss); const k = lh * 0.82 / sp.h; g.drawImage(sp.f[0], lw / 2 - sp.w * k / 2, lh * 0.95 - sp.h * k, sp.w * k, sp.h * k); } catch (e) {}
      const go = $("#icGo", el);
      if (go) go.onclick = () => { UI.click(); UI.go("form", { mode: "boss", title: T.nm, onGo: (ids) => {
        const team = SV().teamOf(ids); if (!team.length) { UI.toast("持っているキャラを入れてください"); return; }
        SV().S.icpt.tries = (SV().S.icpt.tries | 0) + 1; SV().save();
        UI.battle({ mode: "boss", boss: T.boss, weak: T.weak, L: icL(), team, title: T.nm, bg: T.bg, time: 180 }, (B) => { icRank = null; UI.go("result", { B, kind: "boss", ids }, { replace: true }); });
      } }); };
    },
  };

  /* ══════════ タワー ══════════ */
  function startTower(f, ids) {
    if (f > D().TOWER_MAX) { UI.toast("最上階に到達しています"); return; }
    const st = D().buildTower(f);
    const run = (list) => { const team = SV().teamOf(list); if (!team.length) { UI.toast("タワーは持っているキャラで挑みます"); return; } UI.battle({ mode: "tower", stage: st, team, title: st.nm, bg: st.bg }, (B) => UI.go("result", { B, kind: "tower", st, ids: list }, { replace: true })); };
    if (ids) run(ids); else UI.go("form", { mode: "tower", title: st.nm + "　" + st.title, rec: D().recPower(st.L), onGo: run });
  }
  UI.S.tower = {
    top: true, nav: false, title: "ヴァンガードタワー", en: "TOWER", back: "lobby", bgm: "tower",
    render() {
      const f0 = SV().S.tower.floor, nx = Math.min(D().TOWER_MAX, f0 + 1);
      const from = Math.max(1, f0 - 3), to = Math.min(D().TOWER_MAX, f0 + 9);
      const rows = []; for (let f = from; f <= to; f++) { const st = D().buildTower(f); rows.push('<div class="floor' + (f <= f0 ? " done" : "") + (f === nx && f > f0 ? " cur" : "") + (f % 10 === 0 ? " g" : "") + '"><b>' + f + "F</b><span>" + (f % 10 === 0 ? "守護者の階・" : "") + st.waves.length + " WAVE・敵 Lv." + st.L + "・推奨 " + short(D().recPower(st.L)) + (f % 10 === 0 ? "・💎10＋キューブ" : f % 5 === 0 ? "・欠片＋キット" : "") + "</span>" + (f <= f0 ? '<i class="ok">✓</i>' : "") + "</div>"); }
      return '<div class="wrap"><div class="tw-hero"><b class="num">' + f0 + '<small> / ' + D().TOWER_MAX + "F</small></b><div class=\"ar-prog\"><i style=\"width:" + (f0 / D().TOWER_MAX * 100) + '%"></i></div><p class="muted">持っているキャラで挑む塔。何度でも挑めます（スタミナなし）。はじめて登った階でごほうび、10階ごとに守護者（ボス）。</p>' +
        (f0 < D().TOWER_MAX ? '<button class="btn big wide" id="twGo">' + nx + "F に挑む</button>" : '<b>最上階を制覇しました！</b>') + "</div>" +
        '<div class="h2"><b>階</b></div><div class="floors">' + rows.join("") + "</div></div>";
    },
    mount(el) { const b = $("#twGo", el); if (b) b.onclick = () => { UI.click(); startTower(SV().S.tower.floor + 1); }; },
  };

  /* ══════════ 前哨基地 ══════════ */
  let postRaf = 0;
  UI.S.post = {
    top: true, nav: false, title: "前哨基地", en: "OUTPOST", back: "lobby",
    render() {
      const p = SV().postPending(), wc = SV().wipeCost();
      const keys = Object.keys(p.items).filter((k) => p.items[k] > 0 || p.rate[k] >= 1);
      return '<div class="wrap"><div class="post-scene"><canvas id="poCv"></canvas></div>' +
        '<div class="pan" style="margin-top:10px"><div class="po-h"><b class="num">' + Math.floor(p.h) + "時間" + Math.floor((p.h % 1) * 60) + "分</b><span class='muted'>/ 最大 " + D().OUTPOST_MAX_H + '時間ぶん</span></div><div class="ar-prog"><i style="width:' + (p.h / D().OUTPOST_MAX_H * 100) + '%"></i></div>' +
        '<div class="items" style="margin-top:8px">' + keys.map((k) => '<div class="item">' + UI.itemIc(k) + "<span><small>" + D().ITEMS[k].nm + "</small><b>" + fmt(p.items[k]) + "</b></span></div>").join("") + "</div>" +
        '<div class="sh-btns"><button class="btn big" id="poGet" ' + (p.h >= 0.02 ? "" : "disabled") + '>受け取る</button><button class="btn ghost" id="poWipe" ' + (wc < 0 ? "disabled" : "") + ">殲滅<small>" + (wc < 0 ? "（きょうは終わり）" : wc ? "💎" + wc : "無料") + "</small></button></div>" +
        '<p class="muted">1時間あたり：クレジット ' + fmt(p.rate.credit) + "・バトルデータ " + fmt(p.rate.bdata) + "（キャンペーンを進めるほど増えます）。殲滅＝2時間ぶんをすぐ受け取る（1日4回・1回目は無料）。</p></div></div>";
    },
    mount(el) {
      const c = $("#poCv", el);
      try {
        const r = c.getBoundingClientRect(); const lw = 220, lh = Math.round(220 * r.height / Math.max(1, r.width)); c.width = lw; c.height = lh;
        const g = c.getContext("2d"); g.imageSmoothingEnabled = false; const bg = MB3.Spr.bg("ruins", lw, lh, 0.5);
        const own = SV().ownedIds().slice(0, 5); const walkers = (own.length ? own : ["haru", "chika", "hisako"]).map((id, i) => ({ id, x: 20 + i * 36, d: i % 2 ? -1 : 1, sp: 6 + i }));
        const sprs = walkers.map((w) => { try { return MA.Pix.charSpriteHD(w.id); } catch (e) { return null; } });
        cancelAnimationFrame(postRaf);
        const loop = (t) => {
          if (!document.body.contains(c)) return;
          g.drawImage(bg, 0, 0);
          const by = Math.round(lh * 0.62);
          g.fillStyle = "#2a3354"; g.fillRect(lw * 0.36, by - 34, lw * 0.28, 34); g.fillStyle = "#3c4a78"; g.fillRect(lw * 0.36, by - 38, lw * 0.28, 5); g.fillStyle = "#ffd36b"; for (let i = 0; i < 5; i++) g.fillRect(lw * 0.39 + i * 11, by - 26, 5, 6);
          g.fillStyle = "#c8d2e6"; g.fillRect(lw * 0.5, by - 62, 2, 26); g.fillStyle = "#5ef2ff"; g.fillRect(lw * 0.5 + 2, by - 62 + Math.sin(t / 300) * 1, 14, 8);
          walkers.forEach((w, i) => { const sp = sprs[i]; w.x += w.d * w.sp * 0.016; if (w.x < 10 || w.x > lw - 30) w.d *= -1; if (!sp) return; const fr = sp.side ? sp.side[Math.floor(t / 160 + i) % 4] : sp.idle[0]; const s = 0.42; const x = Math.round(w.x), y = by + 6 + (i % 2) * 6; if (w.d < 0) { g.save(); g.translate(x + fr.width * s, y); g.scale(-1, 1); g.drawImage(fr, 0, 0, fr.width * s, fr.height * s); g.restore(); } else g.drawImage(fr, x, y, fr.width * s, fr.height * s); });
          postRaf = requestAnimationFrame(loop);
        };
        postRaf = requestAnimationFrame(loop);
      } catch (e) {}
      $("#poGet", el).onclick = () => { const got = SV().postClaim(); UI.rewardSheet("前哨基地の報酬", got); UI.refresh(); UI.paintCur(); };
      $("#poWipe", el).onclick = () => { const c2 = SV().wipeCost(); const run = () => { const got = SV().wipe(); if (got) { UI.rewardSheet("殲滅（2時間ぶん）", got); UI.refresh(); UI.paintCur(); } else UI.toast("ジェムが足りないか、きょうの回数が終わりました"); }; if (c2 > 0) UI.confirm("殲滅", "💎" + c2 + " で2時間ぶんの報酬をすぐ受け取りますか？", "受け取る", run); else run(); };
    },
  };

  /* ══════════ 研究 ══════════ */
  UI.S.res = {
    top: true, nav: false, title: "研究所", en: "RESEARCH", back: "lobby",
    render() {
      return '<div class="wrap"><p class="muted">クラスごとの研究で、そのクラスのキャラ全員の HP・攻撃力・防御力が上がります（1Lv ＝ +' + (ST().RESEARCH_PER * 100).toFixed(1) + "%・最大 Lv." + ST().RESEARCH_MAX + "）。</p>" +
        '<div class="labs">' + ["atk", "def", "sup"].map((k) => { const lv = SV().S.res[k] | 0, C = ST().CLASSES[k]; return '<div class="lab" style="--c:' + C.c + '"><b>' + C.nm + '</b><span class="lv num">' + lv + "</span><small>+" + (lv * ST().RESEARCH_PER * 100).toFixed(1) + "%</small>" + (lv < ST().RESEARCH_MAX ? UI.costHTML(D().resCost(lv)) + '<button class="btn sm" data-r="' + k + '">研究する</button><button class="btn sm ghost" data-rm="' + k + '">できるだけ</button>' : "<small>最大</small>") + "</div>"; }).join("") + "</div></div>";
    },
    mount(el) {
      $$("[data-r]", el).forEach((b) => (b.onclick = () => { if (SV().resUp(b.dataset.r)) UI.toast("研究が進みました"); else UI.toast("素材が足りません"); UI.refresh(); UI.paintCur(); }));
      $$("[data-rm]", el).forEach((b) => (b.onclick = () => { const n = SV().resUpMax(b.dataset.rm); UI.toast(n ? "研究が " + n + " Lv 進みました" : "素材が足りません"); UI.refresh(); UI.paintCur(); }));
    },
  };

  /* ══════════ ミッション ══════════ */
  let msTab = "d";
  UI.S.ms = {
    top: true, nav: false, title: "任務", en: "MISSION", back: "lobby",
    render() {
      const L = msTab === "d" ? D().DAILY : D().WEEKLY, wk = msTab === "w", C = wk ? SV().S.ms.wc : SV().S.ms.dc;
      const rwTxt = (rw) => Object.keys(rw).map((k) => (k === "gem" ? "💎" : (D().ITEMS[k] || {}).nm + " ×") + fmt(rw[k])).join("・");
      const can = L.filter((m) => !C[m.id] && SV().msProg(m, wk) >= m.n).length;
      return '<div class="wrap"><div class="seg"><button class="' + (wk ? "" : "on") + '" data-t="d">デイリー</button><button class="' + (wk ? "on" : "") + '" data-t="w">ウィークリー</button></div>' +
        '<div class="sh-btns" style="margin:10px 0"><button class="btn" id="msBulk" ' + (can ? "" : "disabled") + ">まとめて受け取る" + (can ? "（" + can + "）" : "") + "</button></div>" +
        L.map((m) => { const pr = SV().msProg(m, wk), done = C[m.id]; return '<div class="msi' + (done ? " done" : pr >= m.n ? " ready" : "") + '"><span><b>' + esc(m.nm) + "</b><small>" + rwTxt(m.rw) + '</small><div class="bar"><b style="width:' + (pr / m.n * 100) + '%"></b></div></span><span class="num cnt">' + pr + "/" + m.n + "</span>" + (done ? '<span class="chip ok">済</span>' : '<button class="btn sm" data-m="' + m.id + '" ' + (pr >= m.n ? "" : "disabled") + ">受取</button>") + "</div>"; }).join("") +
        (wk ? "" : '<div class="pan msall"><span><b>ぜんぶ達成</b><br><small class="muted">💎' + fmt(D().DAILY_ALL.gem) + "・クレジット " + fmt(D().DAILY_ALL.credit) + '</small></span><button class="btn sm gold" id="msAll" ' + (SV().msAllDone() && !SV().S.ms.dAll ? "" : "disabled") + ">" + (SV().S.ms.dAll ? "済" : "受取") + "</button></div>") + "</div>";
    },
    mount(el) {
      $$("[data-t]", el).forEach((b) => (b.onclick = () => { UI.click(); msTab = b.dataset.t; UI.refresh(); }));
      $$("[data-m]", el).forEach((b) => (b.onclick = () => { const L = msTab === "d" ? D().DAILY : D().WEEKLY; const m = L.find((x) => x.id === b.dataset.m); const got = SV().msClaim(m, msTab === "w"); if (got) UI.rewardSheet(m.nm, got); UI.refresh(); UI.paintCur(); }));
      const bk = $("#msBulk", el); if (bk) bk.onclick = () => { const wk = msTab === "w"; const L = wk ? D().WEEKLY : D().DAILY; let all = []; L.forEach((m) => { const g = SV().msClaim(m, wk); if (g) all = all.concat(g); }); if (!wk) { const g2 = SV().msClaimAll(); if (g2) all = all.concat(g2); } if (all.length) UI.rewardSheet("まとめて受け取りました", mergeGot(all)); UI.refresh(); UI.paintCur(); };
      const a = $("#msAll", el); if (a) a.onclick = () => { const got = SV().msClaimAll(); if (got) UI.rewardSheet("デイリーをぜんぶ達成", got); UI.refresh(); UI.paintCur(); };
    },
  };
  function mergeGot(list) { const m = {}; const out = []; list.forEach((x) => { const k = x[0] + "|" + x[2]; if (m[k]) m[k][1] += x[1]; else { m[k] = x.slice(); out.push(m[k]); } }); return out; }

  /* ══════════ ショップ（★★ 2026-10-31 数をえらんで まとめて買う）══════════ */
  let shopTab = "gen";
  const qty = {};
  UI.S.shop = {
    top: true, nav: true, title: "ショップ", en: "SHOP", back: "lobby", cur: ["credit", "acoin", "gem"],
    render() {
      const L = shopTab === "gen" ? D().SHOP : D().ARENA_SHOP;
      const ct = (c, n) => Object.keys(c).map((k) => (k === "gem" ? "💎" : k === "acoin" ? "✪" : "¢") + fmt(c[k] * n)).join(" ");
      return '<div class="wrap"><div class="seg"><button class="' + (shopTab === "gen" ? "on" : "") + '" data-t="gen">一般ショップ</button><button class="' + (shopTab === "arena" ? "on" : "") + '" data-t="arena">アリーナショップ</button></div><div class="shopl">' +
        L.map((it) => { const left = SV().shopLeft(it), mx = SV().buyMax(it); const n = Math.max(1, Math.min(qty[it.id] || 1, Math.max(1, mx))); qty[it.id] = n; const k0 = Object.keys(it.get)[0];
          return '<div class="shopi"><span class="sic">' + UI.itemIc(k0 === "gear" ? "gear" : k0) + "</span><span class=\"sin\"><b>" + esc(it.nm) + "</b><small>きょうのこり " + left + " / " + it.lim + "</small></span>" +
            (left > 1 && mx > 1 ? '<span class="sq"><button data-q="' + it.id + '" data-d="-1">−</button><b class="num">' + n + '</b><button data-q="' + it.id + '" data-d="1">＋</button><button data-q="' + it.id + '" data-d="max" class="mx">最大</button></span>' : "") +
            '<button class="btn sm buy" data-b="' + it.id + '" ' + (left > 0 && mx > 0 ? "" : "disabled") + ">" + ct(it.cost, n) + "</button></div>"; }).join("") + "</div>" +
        '<p class="muted">品ぞろえと回数は毎日 0:00 に戻ります。ジェム（💎）は XEVARION 共通のジェムです。</p></div>';
    },
    mount(el) {
      $$("[data-t]", el).forEach((b) => (b.onclick = () => { UI.click(); shopTab = b.dataset.t; UI.refresh(); }));
      const L = () => (shopTab === "gen" ? D().SHOP : D().ARENA_SHOP);
      $$("[data-q]", el).forEach((b) => (b.onclick = () => { UI.click(); const it = L().find((x) => x.id === b.dataset.q); const mx = Math.max(1, SV().buyMax(it)); const d = b.dataset.d; qty[it.id] = d === "max" ? mx : Math.max(1, Math.min(mx, (qty[it.id] || 1) + Number(d))); UI.refresh(); }));
      $$("[data-b]", el).forEach((b) => (b.onclick = () => { const it = L().find((x) => x.id === b.dataset.b); const n = qty[it.id] || 1; const run = () => { const got = SV().buy(it, n); if (got) UI.rewardSheet(it.nm + (n > 1 ? " ×" + n : ""), mergeGot(got)); qty[it.id] = 1; UI.refresh(); UI.paintCur(); }; if (it.cost.gem) UI.confirm("購入", esc(it.nm) + (n > 1 ? " ×" + n : "") + " を 💎" + it.cost.gem * n + " で買いますか？", "買う", run); else run(); }));
    },
  };

  /* ══════════ アイテム（★★ 2026-10-31 ご指定「アイテムをまとめて使用」）══════════ */
  let itemGiftTo = "", itemGiftN = 1;
  UI.S.items = {
    top: true, nav: false, title: "アイテム", en: "ITEMS", back: "lobby",
    render() {
      const own = SV().ownedIds(), gifts = SV().cur("gift");
      if (!itemGiftTo || own.indexOf(itemGiftTo) < 0) itemGiftTo = own.filter((id) => SV().unit(id).bond < ST().BOND_MAX).sort((a, b) => SV().unit(a).bond - SV().unit(b).bond)[0] || own[0] || "";
      const gmax = itemGiftTo ? Math.max(1, Math.min(gifts, SV().giftNeed(itemGiftTo))) : 1;
      itemGiftN = Math.max(1, Math.min(itemGiftN, gmax));
      const USE = { bdata: ["キャラのレベル上げ", "units"], manual1: ["スキルの強化", "units"], manual2: ["スキルの強化", "units"], manual3: ["スキルの強化", "units"], kit: ["装備の強化", "units"], olcore: ["装備のオーバーロード", "units"], module: ["追加効果の付けかえ", "units"], shard: ["キューブの強化", "units"], acoin: ["アリーナショップ", "shop"], credit: ["強化・研究", "res"] };
      return '<div class="wrap"><div class="pgh"><b>アイテム</b><span class="pgh-c">持っている素材と使い道</span></div><div class="invs">' +
        D().ITEM_ORDER.map((k) => { const it = D().ITEMS[k], u = USE[k]; return '<div class="inv"><span class="iic">' + UI.itemIc(k) + '</span><span class="iin"><b>' + esc(it.nm) + '</b><small>' + esc(it.d) + "</small>" + (u ? '<button class="ilink" data-use="' + u[1] + '">' + esc(u[0]) + " ›</button>" : "") + '</span><b class="icnt">' + fmt(SV().cur(k)) + "</b></div>"; }).join("") + "</div>" +
        '<div class="h2"><b>好感度ギフトをまとめてわたす</b><em>♥ ×' + gifts + "</em></div>" +
        (own.length ? '<div class="pan"><div class="pick gpick">' + own.map((id) => '<button class="pk' + (id === itemGiftTo ? " in" : "") + (UI.isMax(id) ? " mx" : "") + '" data-g="' + id + '"><img src="' + UI.th(id) + '" alt=""><b>' + esc(UI.nm(id)) + " ♥" + SV().unit(id).bond + "</b></button>").join("") + "</div>" +
          (gifts && itemGiftTo && SV().unit(itemGiftTo).bond < ST().BOND_MAX ? UI.stepper("igStp", itemGiftN, gmax) + '<div class="sh-btns"><button class="btn pink" id="igGo">' + esc(UI.nm(itemGiftTo)) + " に ♥ " + itemGiftN + " 個わたす</button></div>" : '<p class="muted">' + (gifts ? "このキャラの好感度は最大です。" : "好感度ギフトがありません（前哨基地・ショップ・任務で手に入ります）。") + "</p>") + "</div>"
          : '<div class="empty">持っているキャラがいません。</div>') +
        '<div class="h2"><b>まとめて強化（おまかせ）</b></div><div class="pan"><p class="muted" style="margin-top:0">えらんだキャラに、いまの素材でできるだけ「レベル → スキル3つ → 装備（+5 まで）」の順に使います。</p>' +
        (own.length ? '<div class="sh-btns"><button class="btn" id="igBulk" ' + (itemGiftTo ? "" : "disabled") + ">" + esc(itemGiftTo ? UI.nm(itemGiftTo) : "") + " をまとめて強化</button></div>" : "") + "</div></div>";
    },
    mount(el) {
      $$("[data-use]", el).forEach((b) => (b.onclick = () => { UI.click(); UI.go(b.dataset.use); }));
      $$("[data-g]", el).forEach((b) => (b.onclick = () => { UI.click(); itemGiftTo = b.dataset.g; itemGiftN = 1; UI.refresh(); }));
      if ($("#igStp", el)) { const gmax = Math.max(1, Math.min(SV().cur("gift"), SV().giftNeed(itemGiftTo))); UI.bindStepper(el, "igStp", () => itemGiftN, (n) => { itemGiftN = n; UI.refresh(); }, gmax); }
      const go = $("#igGo", el); if (go) go.onclick = () => { const up = SV().gift(itemGiftTo, itemGiftN); try { MB3.Audio.play("ready"); } catch (e) {} UI.toast(up ? "♥ 好感度が " + up + " 上がりました！" : "♥ ギフトを " + itemGiftN + " 個わたしました"); itemGiftN = 1; UI.refresh(); };
      const bk = $("#igBulk", el); if (bk) bk.onclick = () => {
        const id = itemGiftTo; if (!id) return;
        const lv = SV().lvUp(id, 999);
        let sk = 0; for (let r = 0; r < 30; r++) { let any = 0; [0, 1, 2].forEach((i) => { if (SV().skillUp(id, i)) { sk++; any = 1; } }); if (!any) break; }
        let ge = 0; const u = SV().unit(id); ST().GEAR_PARTS.forEach((p) => { if (u.gear[p]) ge += SV().enhanceMax(u.gear[p]); });
        try { MB3.Audio.play("ready"); } catch (e) {}
        UI.toast(lv || sk || ge ? UI.nm(id) + "：Lv +" + lv + "・スキル +" + sk + "・装備 +" + ge : "素材が足りないか、すべて最大です");
        UI.refresh(); UI.paintCur();
      };
    },
  };

  /* ══════════ 設定・遊び方 ══════════ */
  UI.S.set = {
    top: true, nav: false, title: "設定", en: "SETTINGS", back: "lobby",
    render() {
      const S = SV().S.set;
      const sw = (k, nm, sub, ic) => '<div class="msi set"><span class="sic2">' + ic + "</span><span><b>" + nm + "</b><small>" + sub + '</small></span><button class="tgl ' + (S[k] ? "on" : "") + '" data-sw="' + k + '" aria-label="' + nm + '"><i></i></button></div>';
      const sl = (k, nm, v) => '<div class="msi set"><span class="sic2">♪</span><span><b>' + nm + '</b><input type="range" min="0" max="100" value="' + Math.round(v * 100) + '" data-vol="' + k + '"></span><span class="num vv">' + Math.round(v * 100) + "</span></div>";
      return '<div class="wrap">' + sw("bgm", "BGM", "画面・モードごとのオリジナル BGM", "♫") + sl("bgmVol", "BGM の音量", S.bgmVol == null ? 0.55 : S.bgmVol) +
        sw("sfx", "効果音", "銃声・爆発・バーストの音", "🔊") + sl("sfxVol", "効果音の音量", S.sfxVol == null ? 1 : S.sfxVol) +
        sw("auto", "AUTO", "バトルを自動で戦う（バトル中の AUTO と同じ。次のバトルも引きつぎ）", "A") + sw("synchro", "シンクロ装置", "上位5人のレベルに、ほかのキャラを自動でそろえる", "⇅") +
        '<div class="sh-btns"><button class="btn" id="stGuide">▶ 使い方をアニメで見る</button></div>' +
        '<div class="h2"><b>遊び方</b></div>' + D().HELP.map((h) => '<div class="pan help"><b>' + esc(h[0]) + '</b><p class="muted">' + esc(h[1]) + "</p></div>").join("") +
        '<div class="h2"><b>キーボード操作</b></div><div class="pan kbd">' +
        [["バトル", [["1〜5", "そのキャラを操作（バーストの番なら発動）"], ["Space・J（押したまま）", "撃つ（チャージ武器はためて離す）"], ["マウス・矢印・WASD", "照準を動かす"], ["B・Enter", "いま撃てるバースト"], ["Q・E", "前・次のキャラ"], ["T", "AUTO（次のバトルも引きつぎ）"], ["X", "速さ ×1／×2"], ["M", "効果音"], ["Esc・P", "一時停止"]]],
          ["メニュー", [["Esc・Backspace", "もどる（シートを閉じる）"], ["1〜5", "下のナビ（部隊・編成・ロビー・アリーナ・ショップ）"], ["Space・H", "ロビー・キャラ詳細：文字を隠して絵を見る"], ["G", "使い方（アニメ）"]]],
          ["ストーリー", [["Space・Enter・→", "次へ"], ["A", "オート"], ["H", "文字を隠す"], ["Esc", "スキップ"]]]].map((g) => '<b class="kbh">' + g[0] + "</b>" + g[1].map((r) => '<div class="kbr"><kbd>' + esc(r[0]) + "</kbd><span>" + esc(r[1]) + "</span></div>").join("")).join("") + "</div>" +
        '<div class="sh-btns"><button class="btn ghost" id="stPro">プロローグを見る</button><button class="btn ghost" id="stArc">ストーリー</button><a class="btn ghost" href="../index.html">XEVARION へ</a></div>' +
        '<div class="sh-btns"><button class="btn ghost danger" id="stReset">MagiBattle のデータをリセット</button></div>' +
        '<p class="muted" style="text-align:center;margin-top:16px">MagiBattle Ver 3.2.0（2026.10.31）<br>NGX × Magical Future × ISHIDA Production × YRA</p></div>';
    },
    mount(el) {
      $$("[data-sw]", el).forEach((b) => (b.onclick = () => { UI.click(); const k = b.dataset.sw; SV().setSetting(k, !SV().S.set[k]); if (k === "sfx") MB3.Audio.set(SV().S.set.sfx); if (k === "bgm") { try { MB3.BGM.set(SV().S.set.bgm); } catch (e) {} } UI.refresh(); }));
      $$("[data-vol]", el).forEach((r) => {
        r.oninput = () => { const v = Number(r.value) / 100; const vv = r.closest(".msi").querySelector(".vv"); if (vv) vv.textContent = r.value; if (r.dataset.vol === "bgmVol") { try { MB3.BGM.setVol(v); } catch (e) {} } else { try { MB3.Audio.setVol(v); } catch (e) {} } };
        r.onchange = () => { SV().setSetting(r.dataset.vol, Number(r.value) / 100); if (r.dataset.vol === "sfxVol") try { MB3.Audio.play("click"); } catch (e) {} };
      });
      $("#stGuide", el).onclick = () => { UI.click(); UI.guide(); };
      $("#stPro", el).onclick = () => { UI.click(); UI.story("prologue"); };
      $("#stArc", el).onclick = () => { UI.click(); UI.go("story"); };
      $("#stReset", el).onclick = () => { UI.click(); UI.confirm("データをリセット", "MagiBattle の育成（レベル・スキル・装備・キューブ・好感度）・キャンペーンの進み・素材・記録をはじめからにします。<br><b>キャラの所持と凸・ジェムは XEVARION 共通なので消えません。</b>ほかの端末にも同期で反映されます。", "リセットする", () => { SV().reset(); UI.toast("リセットしました"); UI.go("title", {}, { root: true }); }, "red"); };
    },
  };
})();
