/* ============================================================
   MagiResonance — 王道RPG型 コマンドバトルエンジン (DQB)
   ・ターン制: たたかう / じゅもん / とくぎ / ぼうぎょ / どうぐ / にげる
   ・すばやさ順に行動、メッセージウィンドウで進行（タップで送り）
   ・かいしんのいちげき / ミス / ねむり / ためる / バフ・デバフ
   ・さくせん「ガンガンいこうぜ」= オート、はやさ切替
   ・spectate モード: オンライン観戦（メッセージ+HPを受信描画）
   window.DQB として公開。
   ============================================================ */
"use strict";

const DQB = (() => {
  const $ = (s) => document.querySelector(s);
  let B = null;

  /* ══════════ 開始 ══════════ */
  /* cfg = { party, enemies, title, canFlee, mode:"normal"|"spectate",
             items(共有どうぐ {key:n}), onUseItem(key), onEnd(res), onSnap(snap) } */
  function start(cfg) {
    stop();
    B = {
      cfg,
      allies: cfg.party.map((u, i) => mkAlly(u, i)),
      enemies: cfg.enemies.map((u, i) => mkEnemy(u, i)),
      round: 0, over: false, fledFlag: false,
      auto: false, spd: 1,
      msgTap: null, skipType: false,
      spectate: cfg.mode === "spectate",
      canFlee: cfg.canFlee !== false,
      result: null,
    };
    letterize(B.enemies);
    buildDom();
    if (!B.spectate) run().catch(() => {});
    return B;
  }
  function stop() { if (B) { B.over = true; } B = null; }

  function mkAlly(u, i) {
    return Object.assign({}, u, {
      uid: "a" + i, isEnemy: false, alive: u.hp > 0,
      defend: false, charge: false, atkBuf: 0, defBuf: 0, defDown: 0, asleep: 0,
    });
  }
  function mkEnemy(u, i) {
    return Object.assign({}, u, {
      uid: "e" + i, isEnemy: true, alive: true, hp: u.mhp,
      defend: false, charge: false, atkBuf: 0, defBuf: 0, defDown: 0, asleep: 0,
    });
  }
  /* 同名の敵に A/B/C を付ける */
  function letterize(list) {
    const cnt = {};
    list.forEach((e) => { cnt[e.nm] = (cnt[e.nm] || 0) + 1; });
    const seen = {};
    list.forEach((e) => {
      if (cnt[e.nm] > 1) {
        seen[e.nm] = (seen[e.nm] || 0);
        e.dispNm = e.nm + "ＡＢＣＤＥ"[seen[e.nm]];
        seen[e.nm]++;
      } else e.dispNm = e.nm;
    });
  }

  /* ══════════ DOM ══════════ */
  function buildDom() {
    $("#dqTitle").textContent = B.cfg.title || "";
    $("#dqEnemies").innerHTML = B.enemies.map((e) => `
      <div class="dq-en${e.boss ? " boss" : ""}" id="u-${e.uid}">
        <div class="dq-en-ic">${e.img ? `<img src="${e.img}">` : e.ic}</div>
        <div class="dq-en-nm">${e.dispNm}</div>
      </div>`).join("");
    renderParty();
    $("#dqCmd").classList.remove("on");
    $("#dqSub").classList.remove("on");
    $("#dqMsgText").textContent = "";
    updCtrl();
    $("#dqAuto").style.display = B.spectate ? "none" : "";
    $("#battleView").classList.add("on");
    document.body.classList.add("in-battle");
    // メッセージ送りタップ
    $("#battleView").onclick = (ev) => {
      if (ev.target.closest(".dqwin-item") || ev.target.closest(".dq-ctrlbtn")) return;
      if (B && B.msgTap) B.msgTap();
      else if (B) B.skipType = true;
    };
    $("#dqAuto").onclick = (ev) => { ev.stopPropagation(); if (B) { B.auto = !B.auto; updCtrl(); if (B.cmdCancel) B.cmdCancel(); } };
    $("#dqSpd").onclick = (ev) => { ev.stopPropagation(); if (B) { B.spd = B.spd === 1 ? 2 : 1; updCtrl(); } };
  }
  function updCtrl() {
    $("#dqAuto").textContent = "さくせん:" + (B.auto ? "ガンガンいこうぜ" : "めいれいさせろ");
    $("#dqSpd").textContent = "はやさ:" + (B.spd === 1 ? "ふつう" : "はやい");
  }
  function renderParty() {
    $("#dqParty").innerHTML = B.allies.map((u) => `
      <div class="dq-pwin${u.alive ? "" : " dead"}" id="u-${u.uid}">
        <div class="dq-pnm">${u.nm}</div>
        ${u.img ? `<img class="dq-pface" src="${u.img}">` : ""}
        <div class="dq-pst">HP <b class="${u.hp / u.mhp < 0.28 ? "low" : ""}">${u.hp}</b>/${u.mhp}</div>
        <div class="dq-pst">MP <b>${u.mp}</b>/${u.mmp}</div>
        <div class="dq-pbuff">${u.defend ? "🛡" : ""}${u.charge ? "🔥" : ""}${u.atkBuf > 0 ? "💪" : ""}${u.defBuf > 0 ? "✨" : ""}${u.asleep > 0 ? "💤" : ""}</div>
      </div>`).join("");
  }
  function updUnit(u) {
    const el = document.getElementById("u-" + u.uid);
    if (!el) return;
    if (u.isEnemy) {
      el.classList.toggle("dead", !u.alive);
    } else {
      renderParty();
    }
  }
  function el(u) { return document.getElementById("u-" + u.uid); }
  function flashHit(u) {
    const d = el(u); if (!d) return;
    d.classList.remove("hit"); void d.offsetWidth; d.classList.add("hit");
  }
  function actorGlow(u, on) {
    const d = el(u); if (!d) return;
    d.classList.toggle("act", !!on);
  }
  function fxOver(u, ic) {
    const d = el(u); if (!d || !ic) return;
    const f = document.createElement("div");
    f.className = "dq-fx"; f.textContent = ic;
    d.appendChild(f);
    setTimeout(() => f.remove(), 650);
  }
  function shakeStage() {
    const s = $("#battleView");
    s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake");
  }

  /* ══════════ メッセージ ══════════ */
  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function say(text, opt) {
    opt = opt || {};
    return new Promise(async (res) => {
      if (!B) return res();
      const box = $("#dqMsgText"), cur = $("#dqCursor");
      cur.style.visibility = "hidden";
      B.skipType = false;
      // タイプ表示
      const chars = String(text);
      box.textContent = "";
      const cps = 28 * B.spd;
      for (let i = 0; i < chars.length; i++) {
        if (!B || B.skipType) { box.textContent = chars; break; }
        box.textContent = chars.slice(0, i + 1);
        await wait(1000 / cps);
      }
      if (!B) return res();
      box.textContent = chars;
      if (B.cfg.onSnap) { try { B.cfg.onSnap(snap(text)); } catch (e) {} }
      if (window.RSND && !opt.silent) RSND.blip && RSND.blip();
      cur.style.visibility = "visible";
      // 自動送り or タップ
      let done = false;
      const fin = () => { if (done) return; done = true; B.msgTap = null; cur.style.visibility = "hidden"; res(); };
      B.msgTap = fin;
      setTimeout(fin, (opt.hold || 850) / B.spd);
    });
  }
  function snap(m, end) {
    return {
      m: m || "", t: Date.now(),
      a: B.allies.map((u) => ({ hp: u.hp, m: u.mhp, mp: u.mp, al: u.alive ? 1 : 0 })),
      e: B.enemies.map((u) => ({ hp: u.hp, m: u.mhp, al: u.alive ? 1 : 0 })),
      end: end || null,
    };
  }

  /* ══════════ メインループ ══════════ */
  async function run() {
    // 出現メッセージ（同名まとめ）
    const groups = {};
    B.enemies.forEach((e) => { groups[e.nm] = (groups[e.nm] || 0) + 1; });
    for (const nm in groups) {
      const n = groups[nm];
      await say(n > 1 ? `${nm}が ${n}ひき あらわれた！` : `${nm}が あらわれた！`);
    }
    while (B && !B.over) {
      B.round++;
      const acts = [];
      // 味方コマンド
      for (const u of B.allies.filter((x) => x.alive)) {
        if (u.asleep > 0) { acts.push({ actor: u, type: "sleep" }); continue; }
        let a;
        if (B.auto) a = autoCommand(u);
        else {
          actorGlow(u, true);
          a = await commandUI(u);
          actorGlow(u, false);
          if (!B || B.over) return;
          if (a && a.autoNow) { a = autoCommand(u); } // さくせん切替時
        }
        acts.push(a);
      }
      // 敵コマンド
      for (const e of B.enemies.filter((x) => x.alive)) {
        acts.push(e.asleep > 0 ? { actor: e, type: "sleep" } : enemyCommand(e));
      }
      // すばやさ順
      acts.sort((a, b) => (b.actor.agi * (0.75 + Math.random() * 0.5)) - (a.actor.agi * (0.75 + Math.random() * 0.5)));
      for (const a of acts) {
        if (!B || B.over) return;
        if (!a || !a.actor.alive) continue;
        await execute(a);
        if (!B || B.over) return;
      }
      // ターン終了処理
      for (const u of B.allies.concat(B.enemies)) {
        if (!u.alive) continue;
        u.defend = false;
        if (u.atkBuf > 0) u.atkBuf--;
        if (u.defBuf > 0) u.defBuf--;
        if (u.defDown > 0) u.defDown--;
      }
      renderParty();
    }
  }

  /* ══════════ コマンドUI ══════════ */
  function menuWin(elId, title, items, onPick, onBack) {
    const w = $(elId);
    w.innerHTML = (title ? `<div class="dqwin-t">${title}</div>` : "") +
      items.map((it, i) => `<div class="dqwin-item${it.dis ? " dis" : ""}" data-i="${i}">${it.label}</div>`).join("") +
      (onBack ? `<div class="dqwin-item back" data-i="-1">もどる</div>` : "");
    w.classList.add("on");
    w.querySelectorAll(".dqwin-item").forEach((r) => {
      r.onclick = (ev) => {
        ev.stopPropagation();
        const i = +r.dataset.i;
        if (i === -1) { onBack(); return; }
        if (items[i].dis) return;
        if (window.RSND) RSND.tap();
        onPick(items[i], i);
      };
    });
  }
  function closeMenus() { $("#dqCmd").classList.remove("on"); $("#dqSub").classList.remove("on"); }
  function hasItems() { const inv = (B && B.cfg.items) || {}; return Object.keys(inv).some((k) => inv[k] > 0 && ITEMS[k]); }

  function commandUI(u) {
    return new Promise((res) => {
      B.cmdCancel = () => { B.cmdCancel = null; closeMenus(); res({ autoNow: true }); };
      const done = (a) => { B.cmdCancel = null; closeMenus(); res(a); };
      const main = () => {
        $("#dqSub").classList.remove("on");
        const items = [
          { label: "⚔ たたかう", k: "atk" },
          { label: "✨ じゅもん", k: "spell", dis: !(u.spells && u.spells.length) },
          { label: "💥 とくぎ", k: "art", dis: !(u.arts && u.arts.length) },
          { label: "🛡 ぼうぎょ", k: "def" },
          { label: "🎒 どうぐ", k: "item", dis: !hasItems() },
          { label: "🏃 にげる", k: "flee", dis: !B.canFlee },
        ];
        menuWin("#dqCmd", u.nm, items, (it) => {
          if (it.k === "atk") pickEnemy((t) => done({ actor: u, type: "attack", target: t }), main);
          else if (it.k === "def") done({ actor: u, type: "defend" });
          else if (it.k === "flee") done({ actor: u, type: "flee" });
          else if (it.k === "spell") pickSpell(main);
          else if (it.k === "art") pickArt(main);
          else if (it.k === "item") pickItem(main);
        });
      };
      const pickSpell = (back) => {
        const items = u.spells.map((k) => {
          const sp = SPELLS[k];
          return { label: `${sp.nm}<small>MP${sp.mp}</small>`, k, dis: u.mp < sp.mp };
        });
        menuWin("#dqSub", "じゅもん", items, (it) => {
          const sp = SPELLS[it.k];
          routeTarget(sp.tgt, (t) => done({ actor: u, type: "spell", key: it.k, target: t }), () => pickSpell(back));
        }, back);
      };
      const pickArt = (back) => {
        const items = u.arts.map((k) => {
          const a = ARTS[k];
          return { label: `${a.nm}${a.mp ? `<small>MP${a.mp}</small>` : ""}`, k, dis: u.mp < (a.mp || 0) };
        });
        menuWin("#dqSub", "とくぎ", items, (it) => {
          const a = ARTS[it.k];
          routeTarget(a.tgt, (t) => done({ actor: u, type: "art", key: it.k, target: t }), () => pickArt(back));
        }, back);
      };
      const pickItem = (back) => {
        const inv = B.cfg.items || {};
        const items = Object.keys(inv).filter((k) => inv[k] > 0 && ITEMS[k]).map((k) => ({ label: `${ITEMS[k].ic} ${ITEMS[k].nm}<small>×${inv[k]}</small>`, k }));
        menuWin("#dqSub", "どうぐ", items, (it) => {
          const item = ITEMS[it.k];
          const tgt = item.kind === "revive" ? "deadally" : "ally";
          routeTarget(tgt, (t) => done({ actor: u, type: "item", key: it.k, target: t }), () => pickItem(back));
        }, back);
      };
      const routeTarget = (tgt, ok, back) => {
        if (tgt === "one") pickEnemy(ok, back);
        else if (tgt === "ally") pickAlly(false, ok, back);
        else if (tgt === "deadally") pickAlly(true, ok, back);
        else ok(null); // group / allally / self
      };
      const pickEnemy = (ok, back) => {
        const foes = B.enemies.filter((e) => e.alive);
        if (foes.length === 1) return ok(foes[0]);
        menuWin("#dqSub", "どのまもの？", foes.map((e) => ({ label: `${e.ic} ${e.dispNm}`, e })), (it) => ok(it.e), back);
      };
      const pickAlly = (dead, ok, back) => {
        const list = B.allies.filter((a) => (dead ? !a.alive : a.alive));
        if (!list.length) { back(); return; }
        menuWin("#dqSub", "だれに？", list.map((a) => ({ label: `${a.nm}<small>HP${a.hp}/${a.mhp}</small>`, a })), (it) => ok(it.a), back);
      };
      main();
    });
  }

  /* ══════════ AI ══════════ */
  function autoCommand(u) {
    const foes = B.enemies.filter((e) => e.alive);
    const pals = B.allies.filter((a) => a.alive);
    const hurt = pals.filter((a) => a.hp / a.mhp < 0.45).sort((a, b) => a.hp / a.mhp - b.hp / b.mhp);
    const deads = B.allies.filter((a) => !a.alive);
    const has = (k) => u.spells && u.spells.includes(k) && u.mp >= SPELLS[k].mp;
    // 蘇生
    if (deads.length && has("okiron")) return { actor: u, type: "spell", key: "okiron", target: deads[0] };
    // 回復
    if (hurt.length) {
      for (const k of ["naozon", "naoruda", "naoru"]) {
        if (k === "naozon" && hurt.length < 2) continue;
        if (has(k)) return { actor: u, type: "spell", key: k, target: hurt[0] };
      }
    }
    // 攻撃じゅもん（グループ優先）
    const atkSp = (u.spells || []).filter((k) => SPELLS[k].kind === "atk" && u.mp >= SPELLS[k].mp);
    if (atkSp.length) {
      const groupSp = atkSp.filter((k) => SPELLS[k].tgt === "egroup");
      const pick = (foes.length >= 2 && groupSp.length)
        ? groupSp[groupSp.length - 1]
        : atkSp[atkSp.length - 1];
      return { actor: u, type: "spell", key: pick, target: SPELLS[pick].tgt === "one" ? foes[0] : null };
    }
    // とくぎ
    const arts = (u.arts || []).filter((k) => u.mp >= (ARTS[k].mp || 0));
    if (arts.length && Math.random() < 0.6) {
      const grp = arts.find((k) => ARTS[k].tgt === "egroup");
      if (foes.length >= 3 && grp) return { actor: u, type: "art", key: grp, target: null };
      const one = arts.filter((k) => ARTS[k].tgt === "one");
      if (one.length) return { actor: u, type: "art", key: one[(Math.random() * one.length) | 0], target: foes[0] };
    }
    return { actor: u, type: "attack", target: foes[(Math.random() * foes.length) | 0] };
  }

  function enemyCommand(e) {
    const pals = B.allies.filter((a) => a.alive);
    const t = pals[(Math.random() * pals.length) | 0];
    if (e.ai && e.ai !== "atk" && Math.random() < 0.4) {
      if (e.ai === "sleep") return { actor: e, type: "espell", key: "suyarin" };
      if (SPELLS[e.ai]) return { actor: e, type: "espell", key: e.ai, target: SPELLS[e.ai].tgt === "one" ? t : null };
    }
    return { actor: e, type: "attack", target: t };
  }

  /* ══════════ 行動実行 ══════════ */
  function effAtk(u) { return Math.round(u.atk * (u.atkBuf > 0 ? 1.25 : 1) * (u.charge ? 2.2 : 1)); }
  function effDef(u) {
    let d = u.def * (u.defBuf > 0 ? 1.25 : 1) * (u.defDown > 0 ? 0.7 : 1);
    return Math.round(d);
  }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  async function execute(a) {
    const u = a.actor;
    switch (a.type) {
      case "sleep": {
        if (Math.random() < 0.45) { u.asleep = 0; await say(`${dnm(u)}は めをさました！`); }
        else { u.asleep--; await say(`${dnm(u)}は ぐうぐう ねむっている……`); }
        updUnit(u);
        return;
      }
      case "defend": {
        u.defend = true; updUnit(u);
        await say(`${dnm(u)}は みをまもっている。`);
        return;
      }
      case "flee": {
        await say(`${dnm(u)}は にげだした！`);
        const foes = B.enemies.filter((e) => e.alive);
        const boss = foes.some((e) => e.boss);
        const agiA = avg(B.allies.filter((x) => x.alive).map((x) => x.agi));
        const agiE = avg(foes.map((x) => x.agi));
        const ok = !boss && Math.random() < 0.5 + (agiA - agiE) / 150;
        if (ok) { if (window.RSND) RSND.flee && RSND.flee(); return finish({ fled: true }); }
        await say("しかし まわりこまれてしまった！");
        return;
      }
      case "attack": {
        let t = retarget(a.target, u);
        if (!t) return;
        await say(`${dnm(u)}の こうげき！`, { hold: 500 });
        if (window.RSND) RSND.slash && RSND.slash();
        lungeFx(u);
        await doPhysical(u, t, 1.0, 1 / 16);
        return;
      }
      case "art": {
        const art = ARTS[a.key];
        u.mp -= art.mp || 0;
        if (art.kind === "charge") {
          u.charge = true; updUnit(u);
          await say(`${dnm(u)}は ちからを ためている！`);
          return;
        }
        await say(`${dnm(u)}の ${art.nm}！`, { hold: 500 });
        if (window.RSND) RSND.slash && RSND.slash();
        lungeFx(u);
        if (art.tgt === "egroup") {
          for (const t of B.enemies.filter((e) => e.alive)) { if (B && !B.over) await doPhysical(u, t, art.mult, 1 / 24, art); }
        } else {
          const t = retarget(a.target, u); if (!t) return;
          const hits = art.hits || 1;
          for (let i = 0; i < hits; i++) {
            const tt = t.alive ? t : retarget(null, u);
            if (!tt || !B || B.over) break;
            await doPhysical(u, tt, art.mult, (1 / 16) + (art.critUp || 0), art);
          }
        }
        if (art.selfdown) { u.defDown = 2; updUnit(u); }
        return;
      }
      case "spell": {
        const sp = SPELLS[a.key];
        u.mp -= sp.mp; updUnit(u);
        await say(`${dnm(u)}は ${sp.nm}を となえた！`, { hold: 550 });
        if (window.RSND) RSND.spell && RSND.spell();
        await castSpell(u, sp, a.target, false);
        return;
      }
      case "espell": {
        const sp = SPELLS[a.key];
        await say(`${dnm(u)}は ${sp.nm}を となえた！`, { hold: 550 });
        if (window.RSND) RSND.spell && RSND.spell();
        await castSpell(u, sp, a.target, true);
        return;
      }
    }
  }
  function dnm(u) { return u.dispNm || u.nm; }
  function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
  function retarget(t, u) {
    if (t && t.alive) return t;
    const foes = (u.isEnemy ? B.allies : B.enemies).filter((x) => x.alive);
    return foes[(Math.random() * foes.length) | 0] || null;
  }

  async function doPhysical(a, d, mult, critRate, art) {
    mult = mult || 1;
    // ミス
    if (Math.random() < 1 / 18) { await say("ミス！ ダメージを あたえられない！"); return; }
    const crit = Math.random() < (critRate || 1 / 16) + (a.crit || 0);
    let dmg;
    if (crit) {
      dmg = Math.round(effAtk(a) * mult * (0.95 + Math.random() * 0.15));
      await say(a.isEnemy ? "つうこんの いちげき！！" : "かいしんの いちげき！！", { hold: 550 });
      if (window.RSND) RSND.crit && RSND.crit();
      shakeStage();
    } else {
      const base = effAtk(a) * mult / 2 - effDef(d) / 4;
      dmg = Math.max(rnd(0, 1), Math.round(base * (0.85 + Math.random() * 0.3)));
      if (d.defend) dmg = Math.round(dmg / 2);
    }
    a.charge = false;
    await applyDamage(a, d, dmg);
    if (art && art.kind === "atk_defdown" && d.alive && Math.random() < 0.6) {
      d.defDown = 4;
      await say(`${dnm(d)}の しゅびりょくが さがった！`);
    }
  }

  async function castSpell(caster, sp, target, isEnemy) {
    const pals = isEnemy ? B.enemies : B.allies;
    const foes = isEnemy ? B.allies : B.enemies;
    const wisB = 1 + (caster.wis || 0) / 140;
    switch (sp.kind) {
      case "atk": {
        const hitOne = async (t) => {
          fxOver(t, sp.fx);
          const dmg = Math.max(1, Math.round(rnd(sp.pow[0], sp.pow[1]) * wisB * (t.defend ? 0.6 : 1)));
          await applyDamage(caster, t, dmg);
        };
        if (sp.tgt === "egroup") {
          for (const t of foes.filter((x) => x.alive)) { if (B && !B.over) await hitOne(t); }
        } else {
          const t = (target && target.alive) ? target : foes.filter((x) => x.alive)[0];
          if (t) await hitOne(t);
        }
        return;
      }
      case "heal": {
        const healOne = async (t) => {
          const amt = Math.round(rnd(sp.pow[0], sp.pow[1]) * wisB);
          t.hp = Math.min(t.mhp, t.hp + amt);
          fxOver(t, sp.fx); updUnit(t);
          if (window.RSND) RSND.heal && RSND.heal();
          await say(`${dnm(t)}の HPが ${amt} かいふくした！`);
        };
        if (sp.tgt === "allally") { for (const t of pals.filter((x) => x.alive)) await healOne(t); }
        else { const t = (target && target.alive) ? target : pals[0]; if (t) await healOne(t); }
        return;
      }
      case "revive": {
        const t = target && !target.alive ? target : pals.find((x) => !x.alive);
        if (!t) { await say("しかし なにも おこらなかった！"); return; }
        t.alive = true; t.hp = Math.max(1, Math.round(t.mhp * sp.pow[0]));
        fxOver(t, sp.fx); updUnit(t);
        await say(`${dnm(t)}は いきかえった！`);
        return;
      }
      case "defup": {
        pals.filter((x) => x.alive).forEach((t) => { t.defBuf = sp.turns; fxOver(t, sp.fx); updUnit(t); });
        await say("みんなの しゅびりょくが あがった！");
        return;
      }
      case "atkup": {
        const t = (target && target.alive) ? target : pals[0];
        t.atkBuf = sp.turns; fxOver(t, sp.fx); updUnit(t);
        await say(`${dnm(t)}の こうげきりょくが あがった！`);
        return;
      }
      case "defdown": {
        const t = (target && target.alive) ? target : foes.filter((x) => x.alive)[0];
        if (!t) return;
        if (Math.random() < 0.75) { t.defDown = sp.turns; fxOver(t, sp.fx); updUnit(t); await say(`${dnm(t)}の しゅびりょくが さがった！`); }
        else await say("しかし きかなかった！");
        return;
      }
      case "sleep": {
        for (const t of foes.filter((x) => x.alive)) {
          if (t.boss || Math.random() < 0.35) { await say(`${dnm(t)}は ねむらなかった！`); continue; }
          t.asleep = 1 + ((Math.random() * 2) | 0);
          fxOver(t, "💤"); updUnit(t);
          await say(`${dnm(t)}は ねむってしまった！`);
        }
        return;
      }
    }
  }

  async function applyDamage(a, d, dmg) {
    d.hp = Math.max(0, d.hp - dmg);
    flashHit(d);
    if (d.isEnemy) { if (window.RSND) RSND.hitE && RSND.hitE(); }
    else { if (window.RSND) RSND.hitA && RSND.hitA(); shakeStage(); }
    // ねむり解除の可能性
    if (d.asleep > 0 && Math.random() < 0.5) d.asleep = 0;
    updUnit(d);
    if (dmg === 0) await say(`${dnm(d)}は ひらりと みをかわした！`);
    else await say(`${dnm(d)}に ${dmg}の ダメージ！`);
    if (d.hp <= 0) await kill(d);
  }

  async function kill(d) {
    d.alive = false;
    updUnit(d);
    if (d.isEnemy) {
      if (window.RSND) RSND.mdead && RSND.mdead();
      await say(`${dnm(d)}を やっつけた！`);
      if (!B.enemies.some((e) => e.alive)) {
        await victory();
      }
    } else {
      await say(`${dnm(d)}は ちからつきた……`);
      if (!B.allies.some((x) => x.alive)) {
        await say("ぜんめつしてしまった……", { hold: 1100 });
        await say("めのまえが まっくらに なった……", { hold: 1100 });
        return finish({ win: false });
      }
    }
  }

  async function victory() {
    if (window.RSND) RSND.fanfare && RSND.fanfare();
    await say("まものたちを やっつけた！", { hold: 1000 });
    const exp = B.enemies.reduce((s, e) => s + (e.exp || 0), 0);
    const gold = B.enemies.reduce((s, e) => s + (e.gold || 0), 0);
    if (exp) await say(`けいけんち ${exp}ポイント かくとく！`);
    if (gold) await say(`${gold}ゴールドを てにいれた！`);
    return finish({ win: true, exp, gold });
  }

  function finish(part) {
    if (!B || B.result) return;
    B.result = Object.assign({ win: false, fled: false, exp: 0, gold: 0, turns: B.round }, part);
    B.over = true;
    const res = B.result, cb = B.cfg.onEnd;
    if (B.cfg.onSnap) { try { B.cfg.onSnap(snap("", { win: !!res.win, fled: !!res.fled })); } catch (e) {} }
    // 味方の状態を返す（HP/MP持ち越し用）
    res.party = B.allies.map((u) => ({ id: u.id, hp: u.hp, mp: u.mp, alive: u.alive }));
    setTimeout(() => { closeView(); if (cb) cb(res); }, 500);
  }
  function closeView() {
    $("#battleView").classList.remove("on");
    document.body.classList.remove("in-battle");
    closeMenus();
    B = null;
  }
  function forfeit() { if (B && !B.over) finish({ win: false, fled: true }); }

  function lungeFx(u) {
    const d = el(u); if (!d) return;
    d.classList.remove("lunge"); void d.offsetWidth; d.classList.add("lunge");
  }

  /* ══════════ 観戦（オンラインゲスト） ══════════ */
  let lastSnapT = 0;
  function applySnap(s) {
    if (!B || !B.spectate || !s) return;
    if (s.t && s.t <= lastSnapT) return;
    lastSnapT = s.t || 0;
    if (s.m) { $("#dqMsgText").textContent = s.m; }
    // 観戦側は「相手視点の敵=自分」なので反転表示
    (s.e || []).forEach((v, i) => { const u = B.allies[i]; if (u) { u.hp = v.hp; u.mhp = v.m; u.alive = !!v.al; } });
    (s.a || []).forEach((v, i) => { const u = B.enemies[i]; if (u) { u.hp = v.hp; u.alive = !!v.al; updUnit(u); } });
    renderParty();
    if (s.end) {
      const win = !s.end.win; // ホストが負け=こちらの勝ち
      const cb = B.cfg.onEnd;
      B.over = true;
      setTimeout(() => { closeView(); if (cb) cb({ win, spectated: true }); }, 900);
    }
  }

  return { start, stop, forfeit, applySnap, active: () => !!B && !B.over };
})();
window.DQB = DQB;
