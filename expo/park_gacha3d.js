/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 3D で引ける XEVA ガチャ（★★ 2026-10-02 ご指定「XEVAガチャは実際に3Dで引けるようにしてください」）
   ------------------------------------------------------------------
   ・XEVA GACHA PALACE の大広間のまん中に、大きなガチャマシン（金の台・ガラスの玉・カプセル・ハンドル）。
   ・ガチャ台（バナー）で「3D で引く」→ マシンの前へ。1回 / 10連 を押すと、
       ハンドルが回る → カプセルが出てくる → 1つずつ手前に飛んできて割れる（虹＝SSR・金＝キャラ・銀＝アイテム）→ カードが出る →
       さいごに結果の一覧。
   ・抽選・支払い（💎・🎫）・キャラの受け取り・保存は<b>本物のガチャ（gacha.html）そのもの</b>：
       見えない iframe で gacha.html を開き、その中の pull(n) を呼ぶ（同じ規則・同じ天井・同じクラウド同期）。
       結果は revealGacha に渡される前に受け取って、3D で見せる（2D の結果画面は見えない所で閉じる）。
   ・とてもめずらしい「SSR セレクト」（自分で 1 体えらぶ枠）が出たときだけは、本物のガチャの画面を前に出してえらんでもらう。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, TAU = Math.PI * 2;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ══════════════ 裏で動かす本物のガチャ ══════════════ */
  const BG = { fr: null, win: null, ready: false, onResult: null, dlg: 0 };
  function bgLoad() {
    return new Promise((res, rej) => {
      if (BG.ready && BG.win) { try { if (BG.win.pull) return res(BG.win); } catch (e) {} }
      BG.ready = false;
      if (!BG.fr) {
        const fr = document.createElement("iframe"); fr.title = "XEVA GACHA（3D の裏で動く本物のガチャ）"; fr.setAttribute("aria-hidden", "true");
        fr.style.cssText = "position:fixed;left:-10000px;top:0;width:420px;height:780px;border:0;opacity:0;pointer-events:none";
        document.body.appendChild(fr); BG.fr = fr; fr.src = "../gacha.html";
      }
      const t0 = performance.now();
      const chk = () => {
        let w = null, path = ""; try { w = BG.fr.contentWindow; path = w.location.pathname; } catch (e) {}
        let ok = false; try { ok = !!(w && w.pull && w.pickMode && w.revealGacha && w.eval("typeof DB === 'object' && typeof CHARS === 'object' && typeof gMode === 'string'")); } catch (e) {}
        if (path && !/gacha\.html$/.test(path) && performance.now() - t0 > 800) return rej(new Error("account"));
        if (ok) { BG.win = w; BG.ready = true; patch(w); return res(w); }
        if (performance.now() - t0 > 30000) return rej(new Error("timeout"));
        setTimeout(chk, 250);
      };
      chk();
    });
  }
  function patch(w) {
    if (w.__p3d) return; w.__p3d = true;
    /* 裏の画面の音は鳴らさない（3D の方で鳴らす） */
    try { const S = w.eval("typeof SFX === 'object' ? SFX : null"); if (S) Object.keys(S).forEach((k) => { if (typeof S[k] === "function") S[k] = () => {}; }); } catch (e) {}
    const orig = w.revealGacha;
    w.revealGacha = function (results, title, gmode) {
      const r = orig.apply(this, arguments);
      const f = BG.onResult; BG.onResult = null; if (f) f({ results: results || [], title: title || "", gmode });
      return r;
    };
    /* 裏の画面の確認・お知らせは、パークの画面に出す */
    w.uiAlert = (html, o) => dialog(html, o, false);
    w.uiConfirm = (html, o) => dialog(html, o, true);
  }
  function E(expr) { try { return BG.win.eval(expr); } catch (e) { return null; } }
  function info(mode) {
    const m = JSON.stringify(mode);
    const fes = !!E("isFesMode(" + m + ") && fesTicketOK(" + m + ")");
    const c1 = E("gachaCost(1," + fes + ")") || { gems: 5 }, c10 = E("gachaCost(10," + fes + ")") || { gems: 50 };
    const free1 = !!E("isDebutMode(" + m + ") && typeof debutFreeLeft === 'function' && debutFreeLeft(" + m + ") > 0"), free10 = !!E("isDebutMode(" + m + ") && typeof debutFree10Left === 'function' && debutFree10Left(" + m + ") > 0");
    const locked = !!E("(isFesMode(" + m + ") && fesLocked(" + m + ")) || (isDebutMode(" + m + ") && !debutVerOfMode(" + m + "))");
    return { gems: E("DB.orbs") | 0, gt: E("gachaTickets()") | 0, ft: E("fesTickets()") | 0, fes, c1, c10, free1, free10, locked, nm: E("modeDef(" + m + ").nm") || "" };
  }
  function costText(c, free) {
    if (free) return "🎁 無料";
    const p = []; if (c.fes) p.push("🎫F " + c.fes); if (c.tickets) p.push("🎫 " + c.tickets); if (c.gems || !p.length) p.push("💎 " + c.gems);
    return p.join(" ＋ ");
  }
  function pull(mode, n) {
    return new Promise((res) => {
      const w = BG.win; let done = false;
      const fin = (v) => { if (done) return; done = true; clearTimeout(to); res(v); };
      BG.onResult = (v) => fin(v);
      BG.afterDlg = () => { setTimeout(() => { if (BG.onResult) { BG.onResult = null; fin(null); } }, 900); };
      BG.afterConfirm = (v) => { if (!v) setTimeout(() => { if (BG.onResult) { BG.onResult = null; fin(null); } }, 600); };
      try { if (E("gMode") !== mode) w.pickMode(mode); } catch (e) {}
      try { const p = w.pull(n); if (p && p.catch) p.catch(() => fin(null)); } catch (e) { fin(null); }
      const to = setTimeout(() => { if (BG.dlg > 0) return; BG.onResult = null; fin(null); }, 6000);
    });
  }
  function describe(r) {
    const w = BG.win, base = (() => { try { return w.location.href; } catch (e) { return location.href; } })();
    const abs = (p) => { try { return new URL(p, base).href; } catch (e) { return p; } };
    if (r.type === "char") {
      const C = E("CHARS") || {}, c = C[r.id] || { nm: r.id, th: "", img: "" }, s5 = !!(w.isStar5 && w.isStar5(r.id));
      return { kind: "char", rar: s5 ? "SSR" : "SR", nm: c.nm, img: abs(c.img || c.th), th: abs(c.th || c.img), note: r.max ? "💠結晶 +" + (r.cryst || 5) : r.fullAwk ? "👑 限界突破MAX!!" : r.awk ? "限界突破 +" + r.awk : "NEW!", sure: !!r.sure };
    }
    if (r.type === "item") { const I = E("ITEMS") || {}, it = I[r.item] || { nm: r.item, icon: "◆", c: "#9ad8ff" }; return { kind: "item", rar: "ITEM", nm: it.nm + (r.n > 1 ? " ×" + r.n : ""), icon: it.icon || "◆", col: it.c || "#9ad8ff" }; }
    if (r.type === "ticket") return { kind: "item", rar: "ITEM", nm: "フェスチケット" + (r.n > 1 ? " ×" + r.n : ""), icon: "🎫", col: "#ffb020" };
    if (r.type === "gticket") return { kind: "item", rar: "ITEM", nm: "ガチャチケット" + (r.n > 1 ? " ×" + r.n : ""), icon: "🎫", col: "#4a9aff" };
    if (r.type === "orb") return { kind: "item", rar: "ITEM", nm: "ジェム ×" + (r.n || 1), icon: "💎", col: "#7cc4ff" };
    if (r.type === "select") return { kind: "select", rar: "SSR", nm: "SSR セレクト（好きな 1 体）", icon: "✦", col: "#1a1a1a" };
    return { kind: "item", rar: "ITEM", nm: "ゴールド ×" + (r.n || 0), icon: "G", col: "#ffd84a" };
  }

  /* ══════════════ 画面（ボタン・結果・確認） ══════════════ */
  let UI = null;
  function ui() {
    if (UI) return UI;
    const d = document.createElement("div"); d.id = "g3d";
    d.innerHTML = '<div class="g3top"><img class="g3bn" alt=""><div class="g3t"><b class="g3nm"></b><span class="g3bal"></span></div></div>'
      + '<div class="g3msg"></div><div class="g3card"></div>'
      + '<div class="g3btns"><button data-a="p1" class="g3p"></button><button data-a="p10" class="g3p g3p10"></button><button data-a="pick">ガチャを変える</button><button data-a="exit" class="g3x">やめる</button></div>'
      + '<button class="g3skip" data-a="skip">▶▶ まとめて見る</button><div class="g3tap">タップ（E）で次へ</div>'
      + '<div class="g3sum"></div><div class="g3pick"></div><div class="g3dlg"></div>';
    document.body.appendChild(d);
    UI = { root: d, bn: d.querySelector(".g3bn"), nm: d.querySelector(".g3nm"), bal: d.querySelector(".g3bal"), msg: d.querySelector(".g3msg"), card: d.querySelector(".g3card"), btns: d.querySelector(".g3btns"), p1: d.querySelector('[data-a="p1"]'), p10: d.querySelector('[data-a="p10"]'), skip: d.querySelector(".g3skip"), tap: d.querySelector(".g3tap"), sum: d.querySelector(".g3sum"), pick: d.querySelector(".g3pick"), dlg: d.querySelector(".g3dlg") };
    return UI;
  }
  function dialog(html, o, confirm) {
    o = o || {}; const U = ui(); BG.dlg++;
    return new Promise((res) => {
      U.dlg.innerHTML = '<div class="g3dbox"><div class="g3dic">' + esc(o.icon || (confirm ? "❓" : "ℹ️")) + '</div><b>' + esc(o.title || "XEVA GACHA") + '</b><div class="g3dtx">' + String(html) + '</div><div class="g3dbt">'
        + (confirm ? '<button data-v="0">' + esc(o.cancel || "やめる") + "</button>" : "") + '<button data-v="1" class="ok">' + esc(o.ok || "OK") + "</button></div></div>";
      U.dlg.classList.add("on");
      U.dlg.querySelectorAll("button").forEach((b) => { b.onclick = () => { U.dlg.classList.remove("on"); BG.dlg = Math.max(0, BG.dlg - 1); const v = b.dataset.v === "1"; res(confirm ? v : undefined); if (!confirm && BG.afterDlg) { const f = BG.afterDlg; BG.afterDlg = null; f(); } if (confirm && BG.afterConfirm) { const f = BG.afterConfirm; BG.afterConfirm = null; f(v); } }; });
    });
  }

  /* ══════════════ ガチャマシン（大広間のまん中・3D） ══════════════ */
  const CAP_COL = [0xff4a5a, 0x4a8aff, 0xffd84a, 0x5ae08a, 0xff8ad8, 0xa86aff, 0xff9a3a];
  function capsule(col) {
    const g = new T.Group();
    const top = new T.Mesh(new T.SphereGeometry(0.42, 18, 10, 0, TAU, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.1 }));
    const bot = new T.Mesh(new T.SphereGeometry(0.42, 18, 10, 0, TAU, Math.PI / 2, Math.PI / 2), new T.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.3 }));
    const band = new T.Mesh(new T.TorusGeometry(0.42, 0.035, 6, 24).rotateX(Math.PI / 2), new T.MeshStandardMaterial({ color: 0x222226, roughness: 0.5 }));
    g.add(top, bot, band); g.userData = { top, bot }; return g;
  }
  function buildMachine(w, x, z, ry) {
    const grp = new T.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry || 0;
    const gold = new T.MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.28, metalness: 0.85 }), red = new T.MeshStandardMaterial({ color: 0xb8202e, roughness: 0.55 }), dark = new T.MeshStandardMaterial({ color: 0x1a1220, roughness: 0.6 });
    gold.envMapIntensity = 1.1;
    const add = (geo, mat, px, py, pz) => { const m = new T.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; grp.add(m); return m; };
    add(new T.CylinderGeometry(4.2, 4.6, 0.8, 32), gold, 0, 0.4, 0);
    add(new T.BoxGeometry(5.2, 4.4, 5.2), red, 0, 3.0, 0);
    [[-2.62, 0], [2.62, 0], [0, -2.62], [0, 2.62]].forEach(([a, b]) => add(new T.BoxGeometry(a ? 0.3 : 5.4, 4.6, b ? 0.3 : 5.4), gold, a, 3.0, b));
    add(new T.BoxGeometry(5.6, 0.5, 5.6), gold, 0, 5.4, 0);
    /* 正面：XEVA の印・ハンドル・出口・受け皿 */
    const xv = new T.Mesh(new T.PlaneGeometry(1.6, 1.6), new T.MeshBasicMaterial({ map: X.imgTex("../XEVA.png"), transparent: true, toneMapped: false })); xv.position.set(0, 4.25, 2.78); grp.add(xv);
    const crank = new T.Group(); crank.position.set(0, 3.0, 2.8); grp.add(crank);
    const wheel = new T.Mesh(new T.TorusGeometry(0.75, 0.12, 10, 32), gold); crank.add(wheel);
    const hub = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 0.3, 16).rotateX(Math.PI / 2), gold); crank.add(hub);
    const bar = new T.Mesh(new T.BoxGeometry(1.5, 0.18, 0.18), gold); crank.add(bar);
    const knob = new T.Mesh(new T.SphereGeometry(0.2, 12, 10), red); knob.position.set(0.75, 0, 0.18); crank.add(knob);
    add(new T.BoxGeometry(1.6, 1.1, 0.4), dark, 0, 1.55, 2.7);
    const tray = add(new T.BoxGeometry(2.6, 0.3, 1.6), gold, 0, 0.95, 3.4);
    /* ガラスの玉とカプセル */
    const glass = new T.Mesh(new T.SphereGeometry(3.0, 40, 24), new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transmission: 0.0, transparent: true, opacity: 0.22, envMapIntensity: 1.4, depthWrite: false }));
    glass.position.set(0, 8.4, 0); grp.add(glass);
    add(new T.TorusGeometry(3.02, 0.18, 8, 48).rotateX(Math.PI / 2), gold, 0, 8.4, 0);
    add(new T.CylinderGeometry(0.9, 1.3, 0.9, 20), gold, 0, 11.6, 0);
    add(new T.SphereGeometry(0.55, 16, 12), new T.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffc84a, emissiveIntensity: 1.2 }), 0, 12.4, 0);
    const caps = [];
    for (let i = 0; i < 46; i++) { const c = capsule(CAP_COL[i % CAP_COL.length]); const a = Math.random() * TAU, r = Math.random() * 2.2, y = -2.2 + Math.random() * 2.6; c.position.set(Math.cos(a) * r, 8.4 + y, Math.sin(a) * r); c.rotation.set(Math.random() * 3, Math.random() * 3, 0); c.userData.base = c.position.clone(); grp.add(c); caps.push(c); }
    w.scene.add(grp); if (w.loose) w.loose(grp, 220);
    w.colCircle(x, z, 4.7);
    const M = { grp, crank, tray, caps, x, z, ry: ry || 0, t: 0, spin: 0 };
    /* いつも少しだけ動く（光る玉・カプセルのゆれ） */
    w.anim.push((dt, t) => { M.t = t; const sp = M.spin; caps.forEach((c, i) => { const b = c.userData.base; c.position.y = b.y + Math.sin(t * (1.2 + sp * 6) + i) * (0.03 + sp * 0.35); c.rotation.y += dt * (0.2 + sp * 4) * (i % 2 ? 1 : -1); }); crank.rotation.z -= dt * sp * 9; });
    w.g3dMachine = M;
    return M;
  }

  /* ══════════════ 3D のガチャ（main.js の XGames と同じしくみで、カメラを持つ） ══════════════ */
  const G = window.XGames;
  function Gacha3D(ctx) {
    G.Base.call(this, ctx, "gacha3d", "🎰 XEVA GACHA（3D）");
    G.ui().root.classList.add("g3hide");
    const w = ctx.world, M = this.M = w.g3dMachine; this.sel = w.gacha3dSel || { key: "premium", nm: "PREMIUM SELECT" };
    this.state = "load"; this.t = 0; this.q = []; this.cur = -1; this.cards = []; this.outs = [];
    const fx = Math.sin(M.ry), fz = Math.cos(M.ry);
    this.camA = new T.Vector3(M.x + fx * 15.5, 7.4, M.z + fz * 15.5); this.lookA = new T.Vector3(M.x, 6.0, M.z);
    this.camB = new T.Vector3(M.x + fx * 9.6, 3.6, M.z + fz * 9.6); this.lookB = new T.Vector3(M.x + fx * 3.6, 2.0, M.z + fz * 3.6);
    this.camW = this.camA.clone(); this.lookW = this.lookA.clone(); this.lookNow = this.lookA.clone();
    const pl = ctx.player; pl.x = M.x + fx * 15; pl.z = M.z + fz * 15; pl.yaw = M.ry + Math.PI;
    const U = ui(); U.root.className = "on"; U.sum.classList.remove("on"); U.pick.classList.remove("on"); U.card.classList.remove("on"); U.msg.classList.remove("on");
    U.root.querySelectorAll("[data-a]").forEach((b) => { b.onclick = () => this.act(b.dataset.a); });
    U.tap.onclick = () => this.next(); U.card.onclick = () => this.next();
    this.paintTop(true);
    bgLoad().then(() => { if (this.disposed) return; this.state = "menu"; this.paintTop(); }).catch((err) => {
      if (this.disposed) return;
      dialog(err && err.message === "account" ? "ガチャを引くには XEVARION のアカウントが必要です（ホームで作れます）。" : "ガチャの準備ができませんでした。通信のよい所でもう一度ためしてください。", { icon: "⚠️", title: "XEVA GACHA" }, false).then(() => ctx.exit());
    });
  }
  Gacha3D.prototype = Object.create(G.Base.prototype);
  Gacha3D.prototype.ownsMove = true;
  Gacha3D.prototype.ownsCam = true;
  Gacha3D.prototype.paintTop = function (loading) {
    const U = ui(), d = this.sel;
    U.nm.textContent = d.nm || "XEVA GACHA";
    if (d.banner) { U.bn.src = "../" + d.banner; U.bn.style.display = ""; } else U.bn.style.display = "none";
    if (loading || !BG.ready) { U.bal.textContent = "本物のガチャを準備しています…"; U.p1.disabled = U.p10.disabled = true; U.p1.innerHTML = "1回"; U.p10.innerHTML = "10連"; return; }
    const I = info(d.key); this.inf = I;
    U.bal.textContent = "💎 " + I.gems.toLocaleString("ja-JP") + "　🎫 " + I.gt + (I.ft ? "　🎫F " + I.ft : "");
    U.p1.innerHTML = "<b>1回</b><small>" + costText(I.c1, I.free1) + "</small>"; U.p10.innerHTML = "<b>10連</b><small>" + costText(I.c10, I.free10) + "</small><i>SSR確定</i>";
    const can = (c, free) => free || I.gems >= c.gems;
    U.p1.disabled = I.locked || !can(I.c1, I.free1) || this.state !== "menu"; U.p10.disabled = I.locked || !can(I.c10, I.free10) || this.state !== "menu";
    U.btns.classList.toggle("on", this.state === "menu");
    if (I.locked) U.bal.textContent += "　（このガチャはいま引けません）";
  };
  Gacha3D.prototype.act = function (a) {
    const U = ui();
    if (a === "exit") { this.ctx.exit(); return; }
    if (a === "skip") { this.toSummary(); return; }
    if (a === "pick") { this.pickList(); return; }
    if ((a === "p1" || a === "p10") && this.state === "menu") this.start(a === "p10" ? 10 : 1);
    if (a === "again") { U.sum.classList.remove("on"); this.state = "menu"; this.paintTop(); }
    if (a === "close") { this.ctx.exit(); }
  };
  Gacha3D.prototype.pickList = function () {
    const U = ui(), defs = (XPark.gachaDefs && XPark.gachaDefs()) || [];
    U.pick.innerHTML = '<div class="g3pbox"><b>引くガチャをえらぶ</b><div class="g3pl">' + defs.map((d, i) => '<button data-i="' + i + '"><img src="../' + esc(d.banner) + '" alt=""><span>' + esc(d.nm) + "</span></button>").join("") + '</div><button class="g3px">とじる</button></div>';
    U.pick.classList.add("on");
    U.pick.querySelector(".g3px").onclick = () => U.pick.classList.remove("on");
    U.pick.querySelectorAll("[data-i]").forEach((b) => { b.onclick = () => { const d = defs[+b.dataset.i]; this.sel = { key: d.key, nm: d.nm, banner: d.banner }; U.pick.classList.remove("on"); this.paintTop(); }; });
  };
  Gacha3D.prototype.start = function (n) {
    const I = this.inf; if (!I) return;
    this.state = "pay"; ui().btns.classList.remove("on");
    pull(this.sel.key, n).then((res) => {
      if (this.disposed) return;
      if (!res || !res.results.length) { this.state = "menu"; this.paintTop(); return; }
      const list = res.results.map(describe);
      if (list.some((d) => d.kind === "select")) {
        /* SSR セレクト：本物の画面でえらぶ */
        this.state = "menu"; this.paintTop();
        try { BG.fr.style.cssText = "position:fixed;inset:4vh 4vw;width:92vw;height:92vh;border:0;z-index:400;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.6);opacity:1;pointer-events:auto;background:#fff"; } catch (e) {}
        dialog("SSR セレクトが出ました！　前に出たガチャの画面で、好きな 1 体をえらんでください。えらび終わったら「OK」→ この画面の「3D にもどる」を押してください。", { icon: "✦", title: "SSR セレクト", ok: "3D にもどる" }, false).then(() => { try { BG.fr.style.cssText = "position:fixed;left:-10000px;top:0;width:420px;height:780px;border:0;opacity:0;pointer-events:none"; BG.win.closeGres && BG.win.closeGres(); } catch (e) {} this.paintTop(); });
        return;
      }
      this.q = list; this.title = res.title; this.cur = -1; this.state = "crank"; this.t = 0; this.M.spin = 1;
      this.ssr = list.some((d) => d.rar === "SSR");
      this.flash(this.ssr ? "rainbow" : list.some((d) => d.kind === "char") ? "gold" : "");
      this.sound("crank");
    });
  };
  /* 音（パークの音楽がオンのときだけ） */
  Gacha3D.prototype.sound = function (k) {
    try {
      if (!(window.XShows && XShows.AU && XShows.AU.on)) return;
      const ac = this._ac || (this._ac = new (window.AudioContext || window.webkitAudioContext)()); if (ac.state === "suspended") ac.resume();
      const t0 = ac.currentTime, out = ac.createGain(); out.gain.value = 0.14; out.connect(ac.destination);
      const tone = (f, a, d, type, f2) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f, t0 + a); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + a + d); g.gain.setValueAtTime(0, t0 + a); g.gain.linearRampToValueAtTime(1, t0 + a + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t0 + a + d); o.connect(g); g.connect(out); o.start(t0 + a); o.stop(t0 + a + d + 0.05); };
      if (k === "crank") for (let i = 0; i < 6; i++) tone(180 + i * 12, i * 0.16, 0.1, "square");
      else if (k === "drop") tone(520, 0, 0.18, "triangle", 260);
      else if (k === "open") { tone(660, 0, 0.2, "triangle"); tone(990, 0.08, 0.3, "triangle"); }
      else if (k === "ssr") [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.6, "triangle"));
      else if (k === "gold") [523, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.45, "triangle"));
    } catch (e) {}
  };
  Gacha3D.prototype.flash = function (kind) {
    const U = ui(); U.root.classList.remove("fl-rainbow", "fl-gold"); if (!kind) return; void U.root.offsetWidth; U.root.classList.add("fl-" + kind);
  };
  Gacha3D.prototype.drop = function (i) {
    const M = this.M, d = this.q[i], col = d.rar === "SSR" ? 0xffffff : d.kind === "char" ? 0xffc83a : 0x9ab8d8;
    const c = capsule(col); if (d.rar === "SSR") { c.userData.top.material = new T.MeshStandardMaterial({ color: 0xff7ad8, emissive: 0xff5ab8, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.3 }); c.userData.rainbow = true; }
    if (d.kind === "char" && d.rar !== "SSR") c.userData.top.material.emissive = new T.Color(0x8a6010);
    const fx = Math.sin(M.ry), fz = Math.cos(M.ry), rx = Math.cos(M.ry), rz = -Math.sin(M.ry);
    const lane = (i % 5 - 2) * 0.48, row = Math.floor(i / 5) * 0.5;
    c.position.set(M.x + fx * 2.9, 1.5, M.z + fz * 2.9); c.scale.setScalar(0.85);
    c.userData.to = new T.Vector3(M.x + fx * (3.3 + row) + rx * lane, 1.35, M.z + fz * (3.3 + row) + rz * lane); c.userData.t = 0;
    this.add(c); this.outs.push(c); this.sound("drop");
  };
  Gacha3D.prototype.next = function () {
    if (this.state === "show") { this.cur++; if (this.cur >= this.q.length) { this.toSummary(); return; } this.openOne(this.cur); }
  };
  Gacha3D.prototype.openOne = function (i) {
    const d = this.q[i], c = this.outs[i], U = ui(), M = this.M;
    const fx = Math.sin(M.ry), fz = Math.cos(M.ry);
    this.state = "opening"; this.t = 0;
    this.fly = { c, from: c.position.clone(), to: new T.Vector3(M.x + fx * 5.2, 2.6, M.z + fz * 5.2) };
    U.card.classList.remove("on"); U.msg.classList.remove("on");
  };
  Gacha3D.prototype.reveal = function (i) {
    const d = this.q[i], U = ui();
    this.sound(d.rar === "SSR" ? "ssr" : d.kind === "char" ? "gold" : "open");
    if (d.rar === "SSR") this.flash("rainbow"); else if (d.kind === "char") this.flash("gold");
    U.msg.innerHTML = d.rar === "SSR" ? "<b class='ssr'>SSR!!</b>" : d.kind === "char" ? "<b class='sr'>SR</b>" : "";
    U.msg.classList.toggle("on", d.kind === "char");
    U.card.className = "g3card on r-" + d.rar.toLowerCase();
    U.card.innerHTML = d.kind === "char"
      ? '<div class="g3cimg"><img src="' + esc(d.img) + '" alt="" onerror="this.onerror=null;this.src=\'' + esc(d.th) + '\'"></div><div class="g3cinfo"><i>' + d.rar + (d.sure ? "　確定枠" : "") + '</i><b>' + esc(d.nm) + '</b><span>' + esc(d.note) + "</span></div>"
      : '<div class="g3cicon" style="--c:' + esc(d.col) + '">' + esc(d.icon) + '</div><div class="g3cinfo"><i>ITEM</i><b>' + esc(d.nm) + "</b></div>";
    U.tap.classList.add("on");
    this.state = "show";
  };
  Gacha3D.prototype.toSummary = function () {
    if (!this.q.length) return;
    const U = ui(); this.state = "sum"; this.M.spin = 0;
    U.card.classList.remove("on"); U.msg.classList.remove("on"); U.tap.classList.remove("on"); U.skip.classList.remove("on");
    U.sum.innerHTML = '<div class="g3sbox"><b>' + esc(this.title.replace(/（.*$/, "")) + '</b><div class="g3sg">' + this.q.map((d) => '<div class="g3si r-' + d.rar.toLowerCase() + '">' + (d.kind === "char" ? '<img src="' + esc(d.th) + '" alt="">' : '<span class="ic" style="--c:' + esc(d.col) + '">' + esc(d.icon) + "</span>") + "<i>" + d.rar + "</i><b>" + esc(d.nm) + "</b>" + (d.note ? "<small>" + esc(d.note) + "</small>" : "") + "</div>").join("") + '</div><div class="g3sb"><button data-a="again" class="ok">もう一度引く</button><button data-a="close">パークにもどる</button></div></div>';
    U.sum.classList.add("on");
    U.sum.querySelectorAll("[data-a]").forEach((b) => { b.onclick = () => this.act(b.dataset.a); });
    try { BG.win.closeGres && BG.win.closeGres(); } catch (e) {}
    this.outs.forEach((c) => c.parent && c.parent.remove(c)); this.outs = []; if (this.fly) this.fly = null;
    if (this.ssr) G.confetti(120);
  };
  Gacha3D.prototype.update = function (dt, inp) {
    const btn = this.input(inp), U = ui(), M = this.M;
    this.t += dt;
    if (btn.press) { if (this.state === "show") this.next(); else if (this.state === "menu" && this.inf && !U.p1.disabled) this.start(1); }
    if (this.state === "crank") {
      if (this.t > 1.5) { this.state = "drop"; this.t = 0; this.di = 0; }
    } else if (this.state === "drop") {
      const gap = this.q.length > 1 ? 0.16 : 0.3;
      while (this.di < this.q.length && this.t > this.di * gap) { this.drop(this.di); this.di++; }
      if (this.di >= this.q.length && this.t > this.q.length * gap + 0.7) { this.state = "show"; this.cur = -1; M.spin = 0.15; U.skip.classList.toggle("on", this.q.length > 1); this.next(); }
    } else if (this.state === "opening" && this.fly) {
      const k = Math.min(1, this.t / 0.55), e = k * k * (3 - 2 * k), f = this.fly, c = f.c;
      c.position.lerpVectors(f.from, f.to, e); c.position.y += Math.sin(Math.PI * k) * 1.4; c.scale.setScalar(0.85 + e * 0.9); c.rotation.y += dt * 9;
      if (k >= 1) {
        /* 割れる */
        const tp = c.userData.top, bt = c.userData.bot; tp.position.y += dt * 14; bt.position.y -= dt * 6; tp.rotation.z += dt * 6;
        if (this.t > 0.85) { c.visible = false; this.reveal(this.cur); }
      }
    }
    /* 出てきたカプセルが受け皿へ転がる */
    this.outs.forEach((c) => { if (!c.userData.to || (this.fly && this.fly.c === c)) return; c.userData.t = Math.min(1, c.userData.t + dt * 2.2); const k = c.userData.t; c.position.lerp(c.userData.to, Math.min(1, dt * 7)); c.position.y = 1.35 + Math.abs(Math.sin(k * Math.PI * 2.5)) * (1 - k) * 0.9; if (c.userData.rainbow) c.userData.top.material.color.setHSL((this.t * 0.6) % 1, 0.85, 0.6); });
    /* カメラ：マシン全体 → 出口とカード */
    const near = this.state === "opening" || this.state === "show" || this.state === "drop";
    this.camW.lerp(near ? this.camB : this.camA, Math.min(1, dt * 2.2)); this.lookW.lerp(near ? this.lookB : this.lookA, Math.min(1, dt * 2.2));
    const cam = this.ctx.camera; cam.position.lerp(this.camW, Math.min(1, dt * 4)); this.lookNow.lerp(this.lookW, Math.min(1, dt * 4)); cam.lookAt(this.lookNow);
    if (this.state === "menu" && !this._paintT) { this._paintT = 1; this.paintTop(); setTimeout(() => { this._paintT = 0; }, 1500); }
  };
  Gacha3D.prototype.dispose = function () {
    this.disposed = true; if (this.M) this.M.spin = 0;
    G.Base.prototype.dispose.call(this);
    G.ui().root.classList.remove("g3hide");
    const U = ui(); U.root.className = "";
    try { BG.win && BG.win.closeGres && BG.win.closeGres(); } catch (e) {}
    BG.onResult = null;
  };
  if (G) { const _s = G.start; G.start = function (kind, ctx) { if (kind === "gacha3d") return ctx.world.g3dMachine ? new Gacha3D(ctx) : null; return _s(kind, ctx); }; window.XGames.start = G.start; }

  window.XGacha3D = { buildMachine, preload: () => bgLoad().catch(() => {}) };
})();
