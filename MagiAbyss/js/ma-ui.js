/* ============================================================
   MagiAbyss — ma-ui.js
   画面（DOM）：タイトル・戦闘中の HUD・レベルアップ・宝箱・イベント・ポーズ・地図・結果
   ★ ボタンはすべて data-a（と data-v）で受ける。onclick の文字列は書かない。
   ★ confirm()/alert() は使わない（出ない環境がある）。確認は画面の中の枠で出す。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const D = () => MA.D;
  const G = () => MA.G;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const ic = (n, c, cls) => MA.Art.iconHTML(n, c, cls);
  const fmt = (n) => Number(Math.round(n || 0)).toLocaleString();
  const fmtT = (s) => { s = Math.floor(s || 0); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
  const ACT = {};   // data-a の受け口（ma-guild.js も足す）

  /* ══ 画面の切りかえ ══ */
  function scr(id) {
    $$(".scr").forEach((s) => s.classList.toggle("on", s.id === id));
    document.body.dataset.scr = id;
  }
  /* ══ 枠（モーダル）══ */
  let modalStack = [];
  function modal(html, opt) {
    opt = opt || {};
    const m = document.createElement("div");
    m.className = "mdl" + (opt.cls ? " " + opt.cls : "");
    m.innerHTML = '<div class="mdl-in' + (opt.wide ? " wide" : "") + (opt.tall ? " tall" : "") + '">' + (opt.noClose ? "" : '<button class="mdl-x" data-a="closeModal" aria-label="閉じる">' + ic("close") + "</button>") + html + "</div>";
    $("#modals").appendChild(m);
    modalStack.push({ el: m, onClose: opt.onClose });
    requestAnimationFrame(() => m.classList.add("on"));
    return m;
  }
  function closeModal(all) {
    do {
      const top = modalStack.pop(); if (!top) break;
      top.el.classList.remove("on");
      setTimeout(() => top.el.remove(), 160);
      if (top.onClose) try { top.onClose(); } catch (e) {}
    } while (all && modalStack.length);
  }
  function topModal() { return modalStack.length ? modalStack[modalStack.length - 1].el : null; }
  /* 画面の中の確認（confirm の代わり） */
  function ask(text, yes, opt) {
    opt = opt || {};
    const m = modal('<div class="ask"><div class="ask-t">' + text + '</div><div class="row c"><button class="btn ghost" data-a="closeModal">' + (opt.no || "やめる") + '</button><button class="btn ' + (opt.danger ? "danger" : "gold") + '" data-a="askYes">' + (opt.yes || "はい") + "</button></div></div>", { cls: "small", noClose: true });
    m._yes = yes;
  }
  ACT.askYes = (el) => { const m = el.closest(".mdl"); const f = m && m._yes; closeModal(); if (f) f(); };
  ACT.closeModal = () => { MA.Audio.sfx("back"); closeModal(); };

  /* ══ お知らせ（トースト）══ */
  function toast(txt, col) {
    const box = $("#toasts"); if (!box) return;
    const t = document.createElement("div");
    t.className = "toast"; t.style.setProperty("--tc", col || "#ffffff");
    t.innerHTML = esc(txt);
    box.appendChild(t);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => t.classList.add("out"), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  /* ══════════════════════════════════════════════════════════════
     戦闘中の HUD
     ★★ 2026-10-05 作り直し（ご指定「以前に添付したデザインや配置」＝メインバトルUI案）
       上 … 経験値のバー（画面の幅いっぱい）＋まん中に「LEVEL」の札、その下に ゴールド・時間・撃破数
       右上 … 地図（押すと大きく）。その下にクエスト（鍵・探索率…）
       左 … 武器・魔法の列（Lv つき）
       左下（PC）… キャラの顔・HP・MP（スキルと技に使う）・必殺技ゲージ（10目盛り）
                  ＋スキル／技／必殺技／回避のボタン（キーの表示は大きめ）
       スマホ … キャラは左上に小さく。ボタンは右下（キーの表示は出さない）
     ══════════════════════════════════════════════════════════════ */
  /* 技・スキルのアイコン（キャラ詳細・遊び方でも使う） */
  const SKILL_IC = { ripple: "sk_ripple", paint: "sk_prism", dunk: "sk_hoop", rainzone: "sk_umbrella", mirage: "sk_mirage", clone: "sk_clone", waltz: "sk_rose", fanfare: "sk_fanfare", slashwave: "sk_wave", wall: "sk_wall", bloomguard: "sk_forget", oboro: "sk_veil" };
  const ATK_IC = { shot: "at_gun", fan: "at_fan", bounce: "at_ball", petal: "at_petal", slash: "at_claw", orb: "at_orb", thrust: "at_rapier", wave: "at_wave", bigslash: "at_crescent", ball: "at_ball", spark: "at_spark", petalfan: "at_yoipetal" };
  const PASS_IC = { focus: "crit", galestep: "swift", rebound: "at_ball", spreadburn: "fireball", heat: "power", chainkill: "shadowbind", afterdash: "dashup", duo: "music", backwater: "vital", guardian: "guard", wasurena: "regen", yoiyami: "crit", pndrain: "pn_ghost" };
  function kitIc(C, part) {
    /* ★★ 2026-10-09 Pumpkin Night は技ごとに ic を持つ（共通の型なので kind では決めない） */
    if (part === "atk") return C.atk.ic || ATK_IC[C.atk.kind] || "attack";
    if (part === "skill") return C.skill.ic || SKILL_IC[C.skill.kind] || "arcana";
    if (part === "art") { const A = D().ARTS[C.art && C.art.k]; return (A && A.ic) || "burst"; }
    if (part === "trait") { const T = D().TRAITS[C.trait && C.trait.k]; return (T && T.ic) || "star"; }
    if (part === "passive") return PASS_IC[C.passive.kind] || "star";
    if (part === "ult") return "ultc";
    return "info";
  }
  function isTouchUI() { return document.body.classList.contains("touchdev"); }
  /* キーの表示（スマホでは出さない） */
  function kk(a) { return isTouchUI() ? "" : '<kbd class="kk">' + esc(MA.Input.keyLabel(a)) + "</kbd>"; }
  function pill(act, icn, col, lab, nm) {
    return '<button class="hp-b a-' + act + '" data-act="' + act + '" id="pb_' + act + '" title="' + esc(nm) + '">' +
      '<span class="hp-ic">' + ic(icn, col) + '<i class="hp-cd"></i><em class="hp-n"></em></span>' +
      '<span class="hp-t"><small>' + esc(lab) + "</small><b>" + esc(nm) + "</b></span>" + kk(act) + "</button>";
  }
  function buildHud() {
    const g = G(), P = g.P, C = P.C;
    const elC = D().ELEM[C.el].c;
    const Ad = D().ARTS[(C.art && C.art.k) || "starnova"];
    const face = MA.Pix.portrait(P.cid, "../img/t_" + imgName(P.cid) + ".webp", 96, (url) => { const im = $("#hudFace"); if (im) im.src = url; });
    $("#hud").innerHTML = `
      <div class="h-xp"><i id="hExp"></i></div>
      <div class="h-lv"><small>LEVEL</small><b id="hLv">1</b></div>
      <div class="h-stat"><span class="hs-g">${ic("gold")}<b id="hGold">0</b></span><span class="hs-t" id="hTime">00:00</span><span class="hs-k">${ic("skull")}<b id="hKill">0</b></span></div>
      <div class="h-obj" id="hObj"></div>
      <div class="h-boss" id="hBoss" hidden><div class="hb-nm" id="hbNm"></div><div class="hb-bar"><i id="hbHp"></i><em style="left:70%"></em><em style="left:40%"></em><em style="left:15%"></em></div><div class="hb-st" id="hbSt"></div></div>
      <div class="h-tl"><button class="h-menu" data-a="pause" aria-label="メニュー">${ic("gear")}${kk("menu")}</button>${g.diff === "hard" ? '<span class="h-diff">' + ic("hard") + "HARD</span>" : ""}</div>
      <div class="h-char" style="--ec:${elC}">
        <div class="hc-top">
          <div class="hc-face"><img id="hudFace" src="${face || "../img/t_" + imgName(P.cid) + ".webp"}" alt=""><span class="hc-el">${ic("el_" + C.el)}</span></div>
          <div class="hc-main">
            <div class="hc-nm"><b>${esc(C.nm)}</b><em class="r-${C.rank}">${esc(C.rank)}</em><i id="hcLv">Lv.1</i></div>
            <div class="hc-bar hp"><i id="hHp"></i><s id="hSh"></s><b id="hHpT">0/0</b></div>
            <div class="hc-bar mp"><i id="hMp"></i><u id="hMpC1"></u><u id="hMpC2"></u><b id="hMpT">0</b><span>MP</span></div>
            <div class="hc-ult" id="hUlt"><span>必殺技</span><span class="hu-seg">${"<i></i>".repeat(10)}</span><b id="hUltT">0%</b></div>
          </div>
        </div>
        <div class="hc-acts">
          ${pill("skill", kitIc(C, "skill"), null, "スキル", C.skill.nm)}
          ${pill("burst", Ad.ic, null, "技", Ad.nm)}
          ${pill("ult", "ultc", elC, "必殺技", C.ult.nm)}
          ${pill("dash", "dash", null, "回避", "ダッシュ")}
        </div>
      </div>
      <div class="h-map"><canvas id="miniMap" width="112" height="112" data-a="map" aria-label="地図を大きくする"></canvas><span class="hm-z" data-a="map">${ic("map")}<b>拡大</b>${kk("map")}</span><div class="h-bossinfo" id="hBossInfo"></div></div>
      <div class="h-quest" id="hQuest"></div>
      <div class="h-weap" id="hSlots"></div>
      <button class="h-interact" id="hInteract" data-act="interact" hidden>${ic("info")}<span>調べる</span>${kk("interact")}</button>
      <div class="h-fps" id="hFps" hidden></div>
    `;
    /* スマホのボタン（5つの枠に設定の割り当て） */
    const tm = MA.Input.touchMap();
    const TB = { attack: ["attack", "攻撃"], skill: [kitIc(C, "skill"), "スキル"], burst: [Ad.ic, "技"], ult: ["ultc", "必殺技"], dash: ["dash", "回避"], interact: ["info", "調べる"], map: ["map", "地図"] };
    $("#touch").innerHTML = '<div class="t-home" id="tHome"><i></i><span>移動</span></div><div class="t-base" id="tBase"><div class="t-knob" id="tKnob"></div></div>' +
      '<div class="t-btns">' + MA.Input.TOUCH_SLOTS.map((s) => {
        const a = tm[s]; if (!TB[a]) return "";
        return '<button class="tb s-' + s + " a-" + a + '" data-act="' + a + '" id="tb_' + a + '"><span class="tb-ring"></span><span class="tb-ic">' + ic(TB[a][0], a === "ult" ? elC : null) + '</span><em class="tb-n"></em><span class="tb-l">' + TB[a][1] + "</span></button>";
      }).join("") + "</div>";
    MA.Input.bindTouch();
    MA.Input.bindButtons($("#touch"));
    MA.Input.bindButtons($("#hud"));
    MA.applyDeviceClasses && MA.applyDeviceClasses();
    hudSlots();
    actCache = {};
  }
  function imgName(id) {
    /* ★ mb-core は img に "../img/" を前置きすることがあるので、ファイル名だけを取り出す */
    try { if (typeof CHARS !== "undefined" && CHARS[id]) return String(CHARS[id].img).replace(/^.*\//, "").replace(/\.webp$/, ""); } catch (e) {}
    return { takina: "Takina", hibana: "Hibana", fuki: "Fuki", hinano: "Hinano", hanon: "Hanon", kokoha: "Kokoha", mutsumi: "Mutsumi", reina: "Reina", azusa: "Azusa", kumireina: "KumikoReina", kagura: "Kagura", kotori: "Kotori",
      ayano: "Ayano", saki: "Saki", yuka: "Yuka", natsumi: "Natsumi", miu: "Miu", mai: "Mai", chinatsu: "Chinatsu", yuumi: "Yuumi", rina: "Rina", kaori: "Kaori" }[id] || "Takina";
  }
  /* 武器・魔法・能力のアイコン列（左）。武器と魔法は大きく Lv つき */
  function hudSlots() {
    const P = G().P; if (!P) return;
    const w = P.weapons.map((x) => '<div class="wl" style="--c:' + D().ELEM[x.el].c + '" title="' + esc(x.evo ? D().EVOS[x.evo].nm : D().ELEM[x.el].nm + "の" + D().WEAPONS[x.k].nm) + '"><span class="wl-ic">' + ic(x.k, D().ELEM[x.el].c) + "</span><b>" + (x.evo ? "EVO" : "Lv" + x.lv) + "</b></div>").join("");
    const m = P.magics.map((x) => '<div class="wl m" title="' + esc(D().MAGICS[x.k].nm) + '"><span class="wl-ic">' + ic(x.k) + "</span><b>Lv" + x.lv + "</b></div>").join("");
    const s = Object.keys(P.passives).map((k) => '<span class="sl" title="' + esc(D().STATS[k].nm) + '">' + ic(/^seal_/.test(k) ? "seal" : k, D().STATS[k].el ? D().ELEM[D().STATS[k].el].c : null) + "<b>" + P.passives[k] + "</b></span>").join("");
    const r = Array.from(P.res).map((id) => { const R = D().RESONANCES.find((x) => x.id === id); return '<span class="sl r" style="--c:' + R.c + '" title="' + esc(R.nm) + '">' + ic("star", R.c) + "</span>"; }).join("");
    $("#hSlots").innerHTML = w + m + (s || r ? '<div class="sl-row">' + s + r + "</div>" : "");
  }
  /* ボタン（PC の札・スマホの丸）の見た目：p … 再使用まで（1→0）、ring … たまり具合（0→1） */
  let actCache = {};
  function setAct(a, ready, p, ring, num) {
    const sig = (ready ? 1 : 0) + "|" + Math.round(p * 40) + "|" + Math.round(ring * 40) + "|" + num;
    if (actCache[a] === sig) return;
    actCache[a] = sig;
    const pb = document.getElementById("pb_" + a), tb = document.getElementById("tb_" + a);
    [pb, tb].forEach((el) => {
      if (!el) return;
      el.classList.toggle("ready", !!ready);
      el.style.setProperty("--p", p.toFixed(3));
      el.style.setProperty("--g", ring.toFixed(3));
      const n = el.querySelector(".hp-n, .tb-n"); if (n) n.textContent = num;
    });
  }
  let hudT = 0, mmT = 0, fpsN = 0, fpsT = 0;
  function hud(dt) {
    const g = G(); if (!g.running || !g.P) return;
    fpsN++; fpsT += dt;
    hudT += dt; mmT += dt;
    const P = g.P;
    if (hudT >= 0.08) {
      hudT = 0;
      const st = P.st, C = P.C;
      $("#hHp").style.width = Math.max(0, P.hp / st.hp * 100) + "%";
      $("#hSh").style.width = Math.min(100, P.shield / st.hp * 100) + "%";
      $("#hHpT").textContent = Math.ceil(Math.max(0, P.hp)) + " / " + st.hp + (P.shield > 0 ? " +" + Math.round(P.shield) : "");
      $("#hHp").parentNode.classList.toggle("low", P.hp < st.hp * 0.3);
      $("#hMp").style.width = (P.mp / st.mmp * 100) + "%";
      const Ad = MA.W.artDef();
      $("#hMpC1").style.left = Math.min(100, C.skill.mp / st.mmp * 100) + "%";
      $("#hMpC2").style.left = Math.min(100, Ad.mp / st.mmp * 100) + "%";
      $("#hMpT").textContent = Math.floor(P.mp) + " / " + st.mmp;
      /* 必殺技ゲージ（10目盛り） */
      const ug = Math.max(0, Math.min(100, P.ultG));
      const segs = $("#hUlt").querySelectorAll(".hu-seg i");
      segs.forEach((el, i) => { const v = Math.max(0, Math.min(1, ug / 10 - i)); el.style.setProperty("--f", v.toFixed(2)); });
      $("#hUlt").classList.toggle("full", ug >= 100);
      $("#hUltT").textContent = ug >= 100 ? "READY!" : Math.floor(ug) + "%";
      $("#hExp").style.width = Math.min(100, P.exp / P.need * 100) + "%";
      $("#hLv").textContent = P.lv;
      $("#hcLv").textContent = "Lv." + P.lv;
      $("#hGold").textContent = fmt(g.stats.gold);
      $("#hKill").textContent = fmt(g.stats.kills);
      $("#hTime").textContent = (g.mode === "abyss" ? "B" + g.floor + "F " : "") + fmtT(g.t);
      $("#hObj").textContent = g.objective || "";
      /* ボタン：スキル・技・必殺技・回避 */
      const skMax = C.skill.cd * (1 - st.cdr), arMax = Ad.cd * (1 - st.cdr);
      setAct("skill", P.skillCd <= 0 && P.mp >= C.skill.mp, P.skillCd > 0 ? Math.min(1, P.skillCd / skMax) : 0, P.skillCd > 0 ? 1 - Math.min(1, P.skillCd / skMax) : Math.min(1, P.mp / C.skill.mp), P.skillCd > 0 ? String(Math.ceil(P.skillCd)) : (P.mp < C.skill.mp ? "MP" : ""));
      setAct("burst", P.burstCd <= 0 && P.mp >= Ad.mp, P.burstCd > 0 ? Math.min(1, P.burstCd / arMax) : 0, Math.min(1, P.mp / Ad.mp) * (P.burstCd > 0 ? 1 - Math.min(1, P.burstCd / arMax) : 1), P.burstCd > 0 ? String(Math.ceil(P.burstCd)) : (P.mp < Ad.mp ? "MP" : ""));
      setAct("ult", ug >= 100, 0, ug / 100, ug >= 100 ? "" : Math.floor(ug) + "%");
      setAct("dash", P.dashN > 0, P.dashN > 0 ? 0 : Math.min(1, Math.max(0, P.dashCd) / 1.2), P.dashN / Math.max(1, st.dashMax), "×" + P.dashN);
      setAct("attack", true, 0, 1, "");
      setAct("map", true, 0, 1, "");
      /* 調べる（近くに物があるとき） */
      const it = $("#hInteract");
      const show = !!(g.near && !g.near.done && g.near.kind !== "fountain");
      if (it) { it.hidden = !show; if (show) it.querySelector("span").textContent = { altar: "祭壇を調べる", spirit: "精霊の祭壇", circle: "魔法陣を調べる", retreat: "帰還する", exit: g.mode === "abyss" ? "次の階へ" : "脱出する", purifier: "燭台をともす" }[g.near.kind] || "調べる"; }
      setAct("interact", show, 0, show ? 1 : 0, "");
      /* 右のクエスト */
      quest();
      /* ボス */
      const b = g.boss;
      const hb = $("#hBoss");
      if (b && g.bossActive && !b.dead) {
        hb.hidden = false;
        $("#hbNm").textContent = b.name + (b.phase ? "　" + ["", "PHASE 2", "PHASE 3", "FINAL"][b.phase] : "");
        $("#hbHp").style.width = Math.max(0, b.hp / b.mhp * 100) + "%";
        $("#hbSt").textContent = b.breakT > 0 ? "BREAK！ ダメージ2倍" : (g.gims && g.gims.length ? D().BOSSES[b.bk].gim.nm + "：のこり " + g.gims.filter((x) => (x.kind === "rune" ? !x.on : !x.dead)).length : "");
        hb.classList.toggle("brk", b.breakT > 0);
      } else hb.hidden = true;
      const bi = $("#hBossInfo");
      const biH = g.mode === "dungeon" ? (g.bossDone ? "ボス：討伐ずみ" : g.bossActive ? "ボス：戦闘中" : g.bossOpen ? "ボス：扉が開いた" : "ボス：封印中") : (g.abyssBoss ? "階層ボスの階" : (g.rule && g.rule.id !== "none" ? g.rule.nm : "深淵"));
      if (bi._h !== biH) { bi.textContent = biH; bi._h = biH; }
      if (g._slotSig !== slotSig(P)) { g._slotSig = slotSig(P); hudSlots(); }
      if (MA.Save.S.set.fps && fpsT > 0) { const f = $("#hFps"); f.hidden = false; f.textContent = Math.round(fpsN / fpsT) + "fps / 敵" + g.E.filter((e) => !e.dead).length; }
      if (fpsT > 1) { fpsN = 0; fpsT = 0; }
    }
    if (mmT >= 0.25) {
      mmT = 0;
      const mc = $("#miniMap"); if (mc) MA.Render.drawMap(mc.getContext("2d"), mc.width, mc.height);
    }
  }
  function slotSig(P) { return P.weapons.map((w) => w.k + w.lv + (w.evo || "")).join() + "|" + P.magics.map((m) => m.k + m.lv).join() + "|" + JSON.stringify(P.passives) + "|" + Array.from(P.res).join(); }
  function quest() {
    const g = G(), map = g.map;
    let h = '<div class="q-t">' + ic("flag") + "<b>" + (g.mode === "abyss" ? "深淵踏破" : esc(g.dun.nm)) + "</b>" + (g.diff === "hard" ? '<em class="q-hard">HARD</em>' : "") + "</div>";
    if (g.mode === "dungeon") {
      h += '<div class="q-keys">' + Array.from({ length: g.keysNeed }, (_, i) => '<span class="' + (i < g.keys ? "on" : "") + '">' + ic("key") + "</span>").join("") + '<small>鍵 ' + g.keys + "/" + g.keysNeed + "</small></div>";
      const seen = map.rooms.filter((r) => r.seen).length;
      h += '<div class="q-l">探索率 <b>' + Math.round(seen / map.rooms.length * 100) + "%</b>　中ボス " + (g.midDone ? '<b class="ok">撃破</b>' : g.mid ? "<b>戦闘中</b>" : "未発見") + "</div>";
      if (map.sealedRoom >= 0) h += '<div class="q-l">封印区域 ' + (g.sealKey ? '<b class="ok">開放</b>' : "封印中") + "</div>";
      if (g.trial) h += '<div class="q-l warn">試練 のこり <b>' + Math.ceil(g.trial.left) + "</b>秒</div>";
      if (g.timedRoom && g.timedRoom.left > 0) h += '<div class="q-l warn">時間制限 <b>' + Math.ceil(g.timedRoom.left) + "</b>秒</div>";
      if (g.corruption > 0) h += '<div class="q-l"><span class="taint" style="--w:' + g.corruption + '%">汚染</span></div>';
      /* クリア時間のミッション：次にねらえる段 */
      const tl = MA.Prog.timeList(g.dun.id, g.diff || "normal");
      const nx = tl.filter((m) => !m.done && g.t <= m.min * 60).sort((a, b) => a.min - b.min)[0];
      if (nx) h += '<div class="q-l q-tm">' + ic("st_time") + "あと <b>" + fmtT(nx.min * 60 - g.t) + "</b> で " + ic("gem") + "<b>" + nx.gem + "</b></div>";
      if (g.mutList.length) h += '<div class="q-mut">' + g.mutList.map((k) => esc(D().MUTATIONS[k].nm)).join("・") + "</div>";
    } else {
      h += '<div class="q-l">' + (g.abyssBoss ? "階層ボス" : "撃破 <b>" + Math.min(g.floorKills || 0, g.floorNeed) + "</b>/" + g.floorNeed) + "</div>";
      if (g.rule && g.rule.id !== "none") h += '<div class="q-mut">' + esc(g.rule.nm) + "：" + esc(g.rule.d) + "</div>";
    }
    const el = $("#hQuest"); if (el && el._h !== h) { el.innerHTML = h; el._h = h; }
  }

  /* ══════════════════════════════════════════════════════════════
     レベルアップ
     ══════════════════════════════════════════════════════════════ */
  let curCards = [];
  function showLevelUp(cards) {
    curCards = cards;
    const P = G().P;
    const html = '<div class="lvup"><div class="lv-h"><b>LEVEL UP!</b><span>Lv.' + P.lv + '</span></div><div class="cards">' +
      cards.map((c, i) => '<button class="card r-' + (c.rar || "N") + '" data-a="pickCard" data-v="' + i + '" style="--rc:' + c.rarC + ";--cc:" + (c.col || c.rarC) + '">' +
        '<div class="c-top"><span class="c-rar">' + (c.rar || "N") + '</span>' + (c.tag ? '<span class="c-tag">' + esc(c.tag) + "</span>" : "") + (c.cat ? '<span class="c-cat">' + esc(c.cat) + "</span>" : "") + "</div>" +
        '<div class="c-ic">' + ic(c.icon, c.col) + "</div>" +
        '<div class="c-nm">' + esc(c.nm) + "</div>" +
        '<div class="c-lv">' + (c.lvTo != null ? "Lv " + c.lvFrom + " → <b>" + c.lvTo + "</b>" : "") + "</div>" +
        '<div class="c-d">' + c.d + "</div><kbd>" + (i + 1) + "</kbd></button>").join("") +
      '</div><div class="row c lv-ft"><button class="btn ghost" data-a="lvBanish"' + (P.banish > 0 ? "" : " disabled") + ">" + ic("sand") + "とばす（" + P.banish + "）</button>" +
      '<button class="btn" data-a="lvReroll"' + (P.rerolls > 0 ? "" : " disabled") + ">" + ic("dice") + "引き直し（" + P.rerolls + "）</button></div></div>";
    modal(html, { cls: "lvm", noClose: true, wide: true });
  }
  ACT.pickCard = (el) => {
    const c = curCards[+el.dataset.v]; if (!c) return;
    MA.Audio.sfx("click");
    closeModal();
    MA.Cards.apply(c);
    MA.E.afterCard();
  };
  ACT.lvReroll = () => { const P = G().P; if (P.rerolls <= 0) return; P.rerolls--; closeModal(); showLevelUp(MA.Cards.roll()); };
  ACT.lvBanish = () => { const P = G().P; if (P.banish <= 0) return; P.banish--; G().stats.gold += 20; closeModal(); MA.E.afterCard(); };

  /* ══ 宝箱 ══ */
  let chestList = [];
  function showChest(list, tier) {
    chestList = list;
    const html = '<div class="chest"><div class="ch-h">' + ic("chest") + "<b>" + (tier >= 3 ? "ボスの宝箱" : tier === 2 ? "レアな宝箱" : "宝箱") + '</b></div><div class="ch-list">' +
      list.map((c, i) => '<div class="ch-it" style="--d:' + (i * 0.28) + "s;--rc:" + (c.rarC || "#fff") + '">' + ic(c.icon || "chest", c.col) + '<div><b>' + esc(c.nm) + (c.rar && c.type === "gear" ? ' <span class="c-rar" style="--rc:' + c.rarC + '">' + c.rar + "</span>" : "") + "</b><small>" + c.d + "</small></div></div>").join("") +
      '</div><div class="row c"><button class="btn gold" data-a="takeChest">受け取る</button></div></div>';
    modal(html, { cls: "chm", noClose: true });
  }
  ACT.takeChest = () => { closeModal(); MA.Cards.applyChest(chestList); MA.E.afterCard(); };

  /* ══ イベント（祭壇・精霊・魔法陣）══ */
  let curEvent = null;
  function showEvent(o) {
    curEvent = o;
    const ev = D().EVENTS[o.kind];
    let opts = ev.opts;
    if (o.kind === "spirit") {
      const els = D().ELEM_KEYS.slice().sort(() => Math.random() - 0.5).slice(0, 2);
      opts = els.map((el) => ({ k: "seal_el", v: el, nm: D().ELEM[el].nm + "の刻印", d: D().ELEM[el].nm + "属性のダメージアップ・共鳴の条件（" + D().ELEM[el].fx + "）" }));
    }
    const html = '<div class="evt"><div class="ev-h">' + ic(o.kind === "circle" ? "arcana" : o.kind === "spirit" ? "luck" : "crystal") + "<b>" + esc(ev.nm) + '</b></div><p class="ev-d">' + esc(ev.d) + '</p><div class="ev-opts">' +
      opts.map((x) => '<button class="evo" data-a="evPick" data-v="' + x.k + '" data-x="' + (x.v || "") + '"><b>' + esc(x.nm) + "</b><small>" + esc(x.d) + "</small></button>").join("") +
      '</div><div class="row c"><button class="btn ghost" data-a="evLeave">立ち去る</button></div></div>';
    modal(html, { cls: "evm", noClose: true });
  }
  ACT.evPick = (el) => { closeModal(); MA.Audio.sfx("key"); MA.E.eventChoice(curEvent, el.dataset.v, el.dataset.x); };
  ACT.evLeave = () => { closeModal(); MA.E.resume(); };
  function showRetreat() {
    const g = G();
    const html = '<div class="evt"><div class="ev-h">' + ic("door") + '<b>帰還の魔法陣</b></div><p class="ev-d">ここからギルドへ帰還できます。<br>帰還すると、手に入れた素材とゴールドの <b>7割</b>を持ち帰れます（装備はすべて）。<br>迷宮のクリアにはなりません。</p><div class="row c"><button class="btn ghost" data-a="evLeave">探索をつづける</button><button class="btn danger" data-a="doRetreat">帰還する</button></div></div>';
    modal(html, { cls: "evm", noClose: true });
    void g;
  }
  ACT.doRetreat = () => { closeModal(); MA.E.endRun("retreat"); };

  /* ══ ポーズ ══ */
  function showPause() {
    const g = G();
    const html = '<div class="pause"><div class="ev-h">' + ic("gear") + '<b>ポーズ</b></div>' +
      '<div class="ps-info">' + (g.mode === "abyss" ? "深淵踏破 " + g.floor + "階" : esc(g.dun.nm)) + "　" + fmtT(g.t) + "　撃破 " + fmt(g.stats.kills) + "</div>" +
      '<div class="ps-build">' + buildHTML() + "</div>" +
      '<div class="col"><button class="btn gold" data-a="resume">' + ic("back") + 'つづける</button><button class="btn" data-a="map">' + ic("map") + '地図を見る（Tab）</button><button class="btn" data-a="openSettings">' + ic("gear") + '設定</button><button class="btn ghost" data-a="askRetreat">' + ic("door") + "探索をやめる（帰還）</button></div>" +
      '<p class="hint">探索の途中は10秒ごとに自動で控えています。アプリを閉じても、次に開いたときに再開できます。</p></div>';
    modal(html, { cls: "psm", noClose: true });
  }
  function buildHTML() {
    const P = G().P;
    const w = P.weapons.map((x) => "<li>" + ic(x.k, D().ELEM[x.el].c) + esc(x.evo ? D().EVOS[x.evo].nm : D().ELEM[x.el].nm + "の" + D().WEAPONS[x.k].nm) + " <b>" + (x.evo ? "EVO" : "Lv" + x.lv) + "</b></li>").join("");
    const m = P.magics.map((x) => "<li>" + ic(x.k) + esc(D().MAGICS[x.k].nm) + " <b>Lv" + x.lv + "</b></li>").join("");
    const r = Array.from(P.res).map((id) => { const R = D().RESONANCES.find((x) => x.id === id); return '<li class="rs" style="--c:' + R.c + '">' + ic("star", R.c) + esc(R.nm) + "</li>"; }).join("");
    return "<ul>" + w + m + "</ul>" + (r ? '<div class="sub">星脈共鳴</div><ul>' + r + "</ul>" : "");
  }
  ACT.resume = () => { closeModal(true); MA.E.resume(); };
  ACT.pause = () => { if (!G().running || G().paused) return; MA.E.pause("menu"); showPause(); };
  ACT.askRetreat = () => ask("探索をやめてギルドへ帰還しますか？<br><small>素材とゴールドは7割を持ち帰ります。</small>", () => { closeModal(true); MA.E.endRun("retreat"); }, { yes: "帰還する", danger: 1 });
  ACT.map = () => {
    if (!G().running) return;
    if (!G().paused) MA.E.pause("map");
    showMap();
  };
  function showMap() {
    const m = modal('<div class="fmap" data-a="closeMap"><div class="ev-h">' + ic("map") + "<b>全体マップ</b><small>どこを押しても閉じます</small></div><canvas id=\"fullMap\" width=\"640\" height=\"440\"></canvas>" +
      '<div class="legend">' + [["#ffffff", "あなた"], ["#ffd84a", "宝箱"], ["#7dffb0", "回復の泉"], ["#c27bff", "魔法陣"], ["#ff8fd0", "祭壇"], ["#4fe39a", "精霊の祭壇"], ["#ff3050", "ボス"], ["#8affc4", "出口"], ["#7a4aff", "帰還"]].map(([c, t]) => '<span><i style="background:' + c + '"></i>' + t + "</span>").join("") + '</div><div class="row c"><button class="btn gold" data-a="closeMap">閉じる</button></div></div>', { cls: "mpm", wide: true, noClose: true });
    const c = $("#fullMap", m);
    MA.Render.drawMap(c.getContext("2d"), c.width, c.height, { full: true });
  }
  ACT.closeMap = () => { closeModal(); if (!modalStack.length) MA.E.resume(); };

  /* ══ 演出 ══ */
  function resonance(r) {
    const el = document.createElement("div");
    el.className = "reso-pop"; el.style.setProperty("--c", r.c);
    el.innerHTML = '<small>星脈共鳴</small><b>' + esc(r.nm) + "</b><span>" + esc(r.d) + "</span>";
    $("#fx").appendChild(el);
    setTimeout(() => el.classList.add("out"), 2800);
    setTimeout(() => el.remove(), 3300);
  }
  function bossIntro(def, e) {
    const el = document.createElement("div");
    el.className = "boss-intro"; el.style.setProperty("--c", def.col);
    el.innerHTML = '<small>BOSS</small><b>' + esc(def.nm) + "</b><span>「" + esc(def.lines[0]) + "」</span>";
    $("#fx").appendChild(el);
    setTimeout(() => el.classList.add("out"), 2200);
    setTimeout(() => el.remove(), 2700);
    void e;
  }
  function bossLine(t) { if (!t) return; const el = document.createElement("div"); el.className = "boss-line"; el.textContent = "「" + t + "」"; $("#fx").appendChild(el); setTimeout(() => el.remove(), 2600); }
  function bossDown(e) {
    const el = document.createElement("div");
    el.className = "boss-intro down"; el.style.setProperty("--c", "#ffd84a");
    el.innerHTML = '<small>BOSS DEFEATED</small><b>' + esc(e.name) + "</b><span>討伐成功！ 宝箱と出口が現れた</span>";
    $("#fx").appendChild(el);
    setTimeout(() => el.classList.add("out"), 2600);
    setTimeout(() => el.remove(), 3100);
  }
  /* 必殺技のカットイン（キャラの絵）
     ★★ 2026-10-09 作り直し（ご指定「UR は縦長の SS の絵」「より豪華に」「カットインに重なって技が見えない」）
       ・前は帯を<b>画面のまん中に横いっぱい</b>出していたので、まん中にいる自分と技の大半を隠していた。
         → 絵は画面の<b>左はしのななめの額</b>に縦長で出し、まん中はあけたまま（まわりだけ少し暗くする）。
       ・UR は縦長の SS 絵（mb-core の ssArtOf）、SSR は正方形の絵の上のほう。
       ・出ているのは 1.25 秒だけ（入り 0.22 秒・抜け 0.25 秒）。押しても止まらない（#fx は pointer-events:none）。 */
  let lastCut = null;
  function cutCheck() {
    const g = G();
    if (g.ultCut && g.ultCut !== lastCut) {
      lastCut = g.ultCut;
      const id = g.ultCut.cid, C = D().CHARS[id] || {};
      const EL = D().ELEM[C.el] || D().ELEM.water;
      const ur = C.rank === "UR";
      let ss = null;
      try { ss = (ur && typeof ssArtOf === "function") ? ssArtOf(id) : null; } catch (e) { ss = null; }
      const el = document.createElement("div");
      el.className = "cutin2" + (ur ? " ur" : "") + (ss ? " tall" : "");
      el.style.setProperty("--cc", EL.c); el.style.setProperty("--cc2", EL.c2 || "#ffffff");
      const sp = Array.from({ length: 12 }, (_, i) => '<i style="--d:' + (i * 0.06).toFixed(2) + "s;--x:" + (6 + (i * 37) % 86) + "%;--y:" + (4 + (i * 53) % 90) + '%"></i>').join("");
      el.innerHTML = '<div class="ci2-vig"></div><div class="ci2-lines"></div><div class="ci2-flash"></div>' +
        '<div class="ci2-panel"><div class="ci2-art"><img src="' + (ss || "../img/" + imgName(id) + ".webp") + '" alt=""' +
        (ss ? ' onerror="this.onerror=null;this.src=\'../img/' + imgName(id) + '.webp\';this.closest(\'.cutin2\').classList.remove(\'tall\')"' : "") + '></div>' +
        '<i class="ci2-shine"></i><div class="ci2-sp">' + sp + "</div>" + (ur ? '<span class="ci2-ur">UR</span>' : "") + "</div>" +
        '<div class="ci2-t"><small>ULTIMATE</small><b>' + esc(g.ultCut.nm) + "</b><span>" + esc(C.nm || "") + "</span></div>";
      $("#fx").appendChild(el);
      setTimeout(() => el.remove(), 1300);
    }
    requestAnimationFrame(cutCheck);
  }

  /* ══════════════════════════════════════════════════════════════
     結果画面
     ══════════════════════════════════════════════════════════════ */
  function showResult(sum) {
    scr("result");
    MA.Input.enabled = false;
    const ttl = sum.mode === "abyss" ? "深淵踏破 " + sum.floor + "階で終了" : { clear: "STAGE CLEAR", defeat: "DEFEATED", retreat: "RETREAT" }[sum.result];
    const hard = sum.diff === "hard";
    /* ★★ 2026-10-05 クリア時間のミッション（ジェム） */
    const tmH = (sum.timeMis && sum.timeMis.length) ? '<div class="rs-sec">' + ic("st_time") + "クリア時間のミッション</div><ul class=\"rs-list rs-tm\">" + sum.timeMis.map((m) => '<li class="' + (m.got ? "got" : "") + '">' + ic("check") + m.min + "分以内に達成 <b>" + (m.got ? ic("gem") + "+" + m.got : m.already ? "受取ずみ" : "受取ずみ（ほかの端末）") + "</b></li>").join("") + "</ul>" : "";
    const sub = sum.mode === "abyss" ? (sum.newRecord ? "自己ベスト更新！" : "") : sum.result === "clear" ? (sum.firstClear ? "初回クリア！" : sum.newRecord ? "ベストタイム更新！" : "") : sum.result === "defeat" ? "素材の " + Math.round(sum.keep * 100) + "% を持ち帰った" : "素材の 70% を持ち帰った";
    const C = D().CHARS[sum.cid];
    const mats = Object.keys(sum.mats).map((k) => '<li>' + ic("mat", D().MATS[k].c) + esc(D().MATS[k].nm) + " <b>×" + sum.mats[k] + "</b></li>").join("");
    const gear = sum.gear.map((x) => '<li style="--rc:' + D().RAR[x.rar].c + '">' + ic(D().SLOTS[D().GEAR[x.id].slot].ic) + esc(D().GEAR[x.id].nm) + ' <span class="c-rar" style="--rc:' + D().RAR[x.rar].c + '">' + x.rar + "</span></li>").join("");
    const res = sum.res.map((id) => { const R = D().RESONANCES.find((r) => r.id === id); return '<li style="--c:' + R.c + '">' + ic("star", R.c) + esc(R.nm) + "</li>"; }).join("");
    const xpLine = sum.trial ? '<div class="rs-xp">持っていないキャラなので経験値は入りません</div>' : '<div class="rs-xp">' + esc(C.nm) + " 経験値 <b>+" + fmt(sum.xp) + "</b>　Lv." + sum.lvBefore + (sum.lvAfter > sum.lvBefore ? ' → <b class="up">Lv.' + sum.lvAfter + "</b>（スキルポイント +" + (sum.lvAfter - sum.lvBefore) + "）" : "") + "</div>";
    $("#result").innerHTML = `
      <div class="rs-bg r-${sum.result}"></div>
      <div class="rs-in">
        <div class="rs-h r-${sum.result}"><b>${ttl}</b><span>${hard ? '<em class="rs-hard">HARD</em>' : ""}${esc(sub)}</span></div>
        <div class="rs-main">
          <img class="rs-char" src="../img/${imgName(sum.cid)}.webp" alt="">
          <div class="rs-body">
            <div class="rs-stats">
              <div><small>時間</small><b>${fmtT(sum.time)}</b></div>
              <div><small>撃破</small><b>${fmt(sum.kills)}</b></div>
              <div><small>最大レベル</small><b>${sum.lv}</b></div>
              <div><small>与ダメージ</small><b>${MA.Pix.shortNum(sum.dmg)}</b></div>
            </div>
            ${xpLine}
            <div class="rs-sec">持ち帰ったもの</div>
            <ul class="rs-list"><li>${ic("gold")}ゴールド <b>+${fmt(sum.gold)}</b></li>${mats}${gear}${sum.gems ? '<li class="wide"><img class="pxi" src="../gem.png" alt="">XEVARION ジェム（' + (sum.firstClear ? "初回クリア" + (sum.timeMis && sum.timeMis.some((m) => m.got) ? "＋クリア時間" : "") : "クリア時間") + "） <b>+" + sum.gems + "</b></li>" : ""}</ul>
            ${tmH}
            ${res ? '<div class="rs-sec">発動した星脈共鳴</div><ul class="rs-list">' + res + "</ul>" : ""}
          </div>
        </div>
        <div class="row c rs-ft">
          <button class="btn ghost" data-a="toGuild">${ic("home")}ギルドへ戻る</button>
          <button class="btn gold" data-a="again">${ic("door")}もう一度</button>
        </div>
      </div>`;
    MA.lastRunCfg = { mode: sum.mode, dun: sum.dun, cid: sum.cid, muts: (G().mutList || []).slice(), diff: sum.diff || "normal" };
    /* 物語は結果を少し見せてから */
    if (sum.story) setTimeout(() => { if (document.body.dataset.scr === "result") MA.Guild && MA.Guild.playStory(sum.story); }, 1400);
  }
  ACT.toGuild = () => { MA.Guild.enter(); };
  ACT.again = () => { const c = MA.lastRunCfg; if (!c) return MA.Guild.enter(); MA.Guild.startRun(c); };

  /* ══ ボタンの受け口（document 全体で1つ）══ */
  function bind() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-a]");
      if (!el || el.disabled) return;
      const a = el.dataset.a;
      const f = ACT[a];
      if (f) { e.preventDefault(); if (a !== "closeModal" && a !== "pickCard") MA.Audio.sfx("click"); f(el, e); }
    });
    /* キーボード：レベルアップの 1〜4、Enter */
    window.addEventListener("keydown", (e) => {
      const top = topModal();
      if (top && top.classList.contains("lvm")) { const n = +e.key; if (n >= 1 && n <= 4) { const b = top.querySelectorAll(".card")[n - 1]; if (b) b.click(); } }
      if (top && e.key === "Escape" && G().running) { if (top.classList.contains("psm")) ACT.resume(); else if (top.classList.contains("mpm")) ACT.closeMap(); }
      if (top && e.key === "Tab" && top.classList.contains("mpm")) { e.preventDefault(); ACT.closeMap(); }
    });
    requestAnimationFrame(cutCheck);
  }

  MA.UI = { ACT, scr, modal, closeModal, topModal, ask, toast, buildHud, hud, hudSlots, kitIc, SKILL_IC, ATK_IC, PASS_IC, showLevelUp, showChest, showEvent, showRetreat, showPause, showMap, resonance, bossIntro, bossLine, bossDown, showResult, bind, ic, esc, fmt, fmtT, imgName, $, $$ };
})();
