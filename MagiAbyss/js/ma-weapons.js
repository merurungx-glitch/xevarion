/* ============================================================
   MagiAbyss — ma-weapons.js
   プレイヤーの攻撃のすべて
   ・通常攻撃（キャラ固有の10種）／固有スキル（Q）／星脈解放（E・共通）／必殺技（R）
   ・探索で手に入る武器6種＋進化／魔法6種
   ・星脈共鳴（タグの組み合わせで発動。効果は orbit / nova / rain / chain / trail / aura / summon / stat）
   ★ どの技もダメージは MA.E.damageEnemy を通す（属性・会心・状態異常・ゲージが必ずそろう）。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  const TAU = Math.PI * 2;
  const D = () => MA.D;
  const E = () => MA.E;
  const G = () => MA.G;
  const A = () => MA.Audio;
  const ec = (el) => (D().ELEM[el] || D().ELEM.water).c;
  const ec2 = (el) => (D().ELEM[el] || D().ELEM.water).c2;

  /* ── 共通の部品 ── */
  function atkOf(mul) { const P = G().P; return P.st.atk * mul; }
  function magOf(mul) { const P = G().P; return P.st.atk * mul * P.st.mag; }
  function skillOf(mul) { const P = G().P; return P.st.atk * mul * P.st.mag * (1 + (P.st.skill || 0)); }
  function ultOf(mul) { const P = G().P; return P.st.atk * mul * P.st.mag * (1 + (P.st.ult || 0)); }
  function cdOf(cd) { const P = G().P; return cd / (P.st.aspd * (P.buffs.haste ? 1 + P.buffs.haste.v : 1) * (P.buffs.fanfare ? 1 + P.buffs.fanfare.a : 1) * (P.buffs.afterdash ? 1 + P.buffs.afterdash.v : 1)); }
  function mcdOf(cd) { const P = G().P; return cd * (1 - P.st.cdr); }
  function aim() { return G().P.aimA; }
  function slashArc(x, y, a, r, arc, dmg, el, opt) {
    let n = 0;
    E().enemiesIn(x, y, r).forEach((e) => {
      let da = Math.atan2(e.y - y, e.x - x) - a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      if (Math.abs(da) > arc / 2 + 0.25) return;
      E().damageEnemy(e, dmg, Object.assign({ el, kx: e.x - x, ky: e.y - y }, opt || {}));
      n++;
    });
    E().fx({ type: "slash", x, y, a, r, arc, t: 0, dur: 0.18, col: ec(el), col2: ec2(el) });
    return n;
  }
  function circleHit(x, y, r, dmg, el, opt) {
    const list = E().enemiesIn(x, y, r);
    list.forEach((e) => E().damageEnemy(e, dmg, Object.assign({ el, kx: e.x - x, ky: e.y - y }, opt || {})));
    return list.length;
  }
  function lineHit(x, y, a, len, w, dmg, el, opt) {
    const ca = Math.cos(a), sa = Math.sin(a);
    let n = 0;
    E().enemiesIn(x + ca * len / 2, y + sa * len / 2, len / 2 + w).forEach((e) => {
      const dx = e.x - x, dy = e.y - y, al = dx * ca + dy * sa, sd = -dx * sa + dy * ca;
      if (al < -e.r || al > len + e.r || Math.abs(sd) > w / 2 + e.r) return;
      E().damageEnemy(e, dmg, Object.assign({ el, kx: ca, ky: sa }, opt || {}));
      n++;
    });
    return n;
  }
  function shoot(o) {
    const sp = o.speed || 260;
    return E().pbullet(Object.assign({ vx: Math.cos(o.a) * sp, vy: Math.sin(o.a) * sp }, o));
  }

  /* ══════════════════════════════════════════════════════════════
     通常攻撃（キャラ固有）
     ══════════════════════════════════════════════════════════════ */
  const NORMAL = {
    /* タキナ：蒼い弾の連射（貫通）・4発ごとに拡散 */
    shot(P, A0) {
      const a = aim(), el = P.C.el;
      P.atkN++;
      const pierce = A0.pierce + P.st.pierce;
      const many = P.atkN % A0.every === 0;
      const n = many ? A0.spread + P.st.spread : 1 + (P.st.multishot && P.moving ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const aa = a + (n > 1 ? (i - (n - 1) / 2) * 0.16 : 0);
        shoot({ x: P.x + Math.cos(aa) * 6, y: P.y - 4 + Math.sin(aa) * 6, a: aa, speed: A0.speed, dmg: atkOf(A0.mul), el, pierce, life: A0.range / A0.speed, r: 3, kind: "bullet", col: ec(el), src: "atk" });
      }
      E().fx({ type: "muzzle", x: P.x + Math.cos(a) * 9, y: P.y - 4 + Math.sin(a) * 9, t: 0, dur: 0.08, col: ec2(el) });
      A().sfx("shot");
    },
    fan(P, A0) {
      const a = aim(), el = P.C.el, n = A0.n + P.st.fan;
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * (A0.arc / Math.max(1, n - 1)); shoot({ x: P.x, y: P.y - 4, a: aa, speed: A0.speed, dmg: atkOf(A0.mul), el, pierce: A0.pierce, life: A0.range / A0.speed, r: 4, kind: "blade", col: ec(el), src: "atk", spin: 1 }); }
      A().sfx("slash");
    },
    bounce(P, A0) {
      const a = aim(), el = P.C.el;
      const b = shoot({ x: P.x, y: P.y - 4, a, speed: A0.speed, dmg: atkOf(A0.mul), el, pierce: 0, life: 2.4, r: 4, kind: "ball", col: "#f08a34", src: "atk", bounceN: A0.bounces + P.st.bounces, ghost: false });
      b.onHit = (bb, e) => {
        if (bb.bounceN <= 0) return;
        const nx = E().nearest(e.x, e.y, 120, (o) => o === e || (bb.hit && bb.hit.has(o.id) && G().t - bb.hit.get(o.id) < 0.5));
        if (!nx) {
          /* ほかに敵がいない：同じ敵へ1回だけはね返る（のこりの跳ねる回数はここで使いきる） */
          const dmg2 = bb.dmg * (1 + A0.bonus);
          bb.bounceN = 0;
          G().queue.push({ at: G().t + 0.22, f: () => { if (e.dead) return; E().damageEnemy(e, dmg2, { el, src: "atk" }); E().fx({ type: "hoop", x: e.x, y: e.y, t: 0, dur: 0.3, r: 12, col: "#f08a34" }); } });
          return;
        }
        bb.bounceN--; bb.pierce = 0; bb.life = 1.2; bb.dmg *= 1 + A0.bonus;
        const aa = Math.atan2(nx.y - e.y, nx.x - e.x), sp = Math.hypot(bb.vx, bb.vy);
        bb.x = e.x; bb.y = e.y; bb.vx = Math.cos(aa) * sp; bb.vy = Math.sin(aa) * sp;
        bb.pierce = 1;
      };
      b.onWall = (bb) => { bb.vx = -bb.vx; bb.vy = -bb.vy; bb.x += bb.vx * 0.02; bb.y += bb.vy * 0.02; };
      A().sfx("shot");
    },
    petal(P, A0) {
      const a = aim(), el = P.C.el, n = A0.n + P.st.petals;
      for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * (A0.arc / Math.max(1, n - 1)) + (Math.random() - 0.5) * 0.08; shoot({ x: P.x, y: P.y - 6, a: aa, speed: A0.speed * (0.85 + Math.random() * 0.3), dmg: atkOf(A0.mul) * P.st.mag, el, pierce: 0, life: A0.range / A0.speed, r: 3, kind: "petal", col: "#ff5a6e", src: "atk", burn: Math.random() < A0.burn * P.st.elem }); }
      A().sfx("slash");
    },
    slash(P, A0) {
      const a = aim(), el = P.C.el;
      const heatMax = P.C.passive.max + (P.st.heat || 0) + (P.st.passive ? 3 : 0);
      const r = A0.r * (1 + Math.min(P.heat, heatMax) * P.C.passive.per);
      const n = slashArc(P.x + Math.cos(a) * 6, P.y - 2 + Math.sin(a) * 6, a, r, A0.arc, atkOf(A0.mul), el, { kb: 6, src: "atk" });
      if (n && el === "fire") P.heat = Math.min(heatMax, P.heat + 1);
      A().sfx("slash");
    },
    orb(P, A0) {
      const a = aim(), el = P.C.el;
      const b = shoot({ x: P.x, y: P.y - 6, a, speed: A0.speed, dmg: atkOf(A0.mul) * P.st.mag, el, pierce: 0, life: A0.range / A0.speed + 0.6, r: 4, kind: "orb", col: ec(el), src: "atk", homing: 3.5 });
      b.onHit = (bb, e) => { E().chainFrom(e, A0.chain + (P.st.chain || 0), bb.dmg * 0.6, el); };
      A().sfx("shot");
    },
    thrust(P, A0) {
      const a = aim(), el = P.C.el;
      const n = lineHit(P.x, P.y - 3, a, A0.len, A0.w, atkOf(A0.mul), el, { src: "atk" });
      E().fx({ type: "thrust", x: P.x, y: P.y - 3, a, len: A0.len, t: 0, dur: 0.12, col: "#e8f2ff", col2: ec(el) });
      if (n) A().sfx("slash");
    },
    wave(P, A0) {
      const a = aim(), el = P.C.el;
      P.atkN++;
      const twice = P.atkN % P.C.passive.every === 0;
      const mk = (off, e2) => shoot({ x: P.x, y: P.y - 4, a: a + off, speed: A0.speed, dmg: atkOf(A0.mul) * P.st.mag, el: e2, pierce: 99, life: A0.range / A0.speed, r: A0.w / 2, kind: "wave", col: ec(e2), src: "atk", grow: 1 });
      mk(0, el);
      if (twice) { mk(0.12, P.C.el2 || el); E().pop(P.x, P.y - 24, "DUO!", "#ff8fd0"); }
      A().sfx("shot");
    },
    bigslash(P, A0) {
      const a = aim(), el = P.C.el;
      slashArc(P.x + Math.cos(a) * 8, P.y - 2 + Math.sin(a) * 8, a, A0.r, A0.arc, atkOf(A0.mul), el, { kb: A0.kb, src: "atk", burn: !!P.st.burnSlash });
      E().fx({ type: "crescent", x: P.x, y: P.y - 2, a, r: A0.r + 6, t: 0, dur: 0.22, col: "#ff3a46" });
      A().sfx("slash");
    },
    ball(P, A0) {
      const a = aim(), el = P.C.el;
      shoot({ x: P.x, y: P.y - 4, a, speed: A0.speed, dmg: atkOf(A0.mul), el, pierce: A0.pierce || 1, life: A0.range / A0.speed, r: 5, kind: "ball", col: "#ef7c2e", src: "atk", kb: A0.kb });
      A().sfx("shot");
    },
  };

  /* ══════════════════════════════════════════════════════════════
     探索の武器
     ══════════════════════════════════════════════════════════════ */
  function wLv(w) { return D().WEAPONS[w.k].lv[Math.min(w.lv, 7) - 1]; }
  const WFIRE = {
    sword(P, w, L, evo) {
      const a = aim(), el = w.el;
      const mul = evo ? evo.mul : L.mul;
      for (let i = 0; i < L.n; i++) G().queue.push({ at: G().t + i * 0.12, f: () => {
        const aa = a + (i % 2 ? 0.3 : -0.3);
        slashArc(P.x + Math.cos(aa) * 8, P.y - 2 + Math.sin(aa) * 8, aa, L.r * P.st.area, 1.9, atkOf(mul), el, { src: "weapon", kb: 4 });
        if (evo) shoot({ x: P.x, y: P.y - 4, a: aa, speed: 220, dmg: atkOf(mul * 0.6), el, pierce: 99, life: 0.7, r: 8, kind: "wave", col: ec(el), src: "weapon" });
        if (w.evo === "evo_mutsumi") G().queue.push({ at: G().t + 0.18, f: () => slashArc(P.x - Math.cos(aa) * 8, P.y - 2 - Math.sin(aa) * 8, aa + Math.PI, L.r * P.st.area, 1.9, atkOf(mul * 0.8), el, { src: "weapon" }) });
        A().sfx("slash");
      } });
    },
    bow(P, w, L, evo) {
      const el = w.el;
      const tgt = E().nearest(P.x, P.y, 260);
      const a0 = tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : aim();
      const n = L.n + (w.evo === "evo_takina" ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const aa = a0 + (i - (n - 1) / 2) * (w.evo === "evo_takina" ? 0.22 : 0.12);
        const b = shoot({ x: P.x, y: P.y - 4, a: aa, speed: L.speed, dmg: atkOf(evo ? evo.mul : L.mul), el, pierce: L.pierce, life: 1.0, r: 3, kind: "arrow", col: ec(el), src: "weapon" });
        if (evo && w.evo === "evo_bow") b.onHit = (bb, e) => { if (Math.random() < 0.3) E().telegraph({ shape: "circle", x: e.x, y: e.y, r: 22, dur: 0.3, col: "#ffe86a", onFire: (o) => { circleHit(o.x, o.y, o.r, atkOf(1.2), "light", { src: "weapon" }); E().fx({ type: "meteor", x: o.x, y: o.y, t: 0, dur: 0.35, col: "#ffe86a" }); } }); };
        if (w.evo === "evo_takina") b.onHit = (bb, e) => { e.defDownT = 2.5; };
      }
      A().sfx("shot");
    },
    tome(P, w, L, evo) {
      /* 回る魔法弾（一定時間）。進化（大魔典など）はずっと回る */
      const el = w.el;
      const n = L.n, life = evo ? 1e9 : L.t;
      w.orbs = w.orbs || [];
      if (evo && w.orbs.length >= n) return;
      w.orbs.forEach((o) => { o.life = 0; });
      w.orbs = [];
      for (let i = 0; i < n; i++) {
        const o = E().pbullet({ x: P.x, y: P.y, vx: 0, vy: 0, dmg: magOf(evo ? evo.mul : L.mul), el, pierce: 999, life, r: 5, kind: "orbit", col: ec(el), src: "weapon", rehit: 0.45, ghost: true, ang: i / n * TAU, rad: L.r * P.st.area,
          update: (b, dt) => { b.ang += dt * 3.4; b.x = G().P.x + Math.cos(b.ang) * b.rad; b.y = G().P.y - 4 + Math.sin(b.ang) * b.rad * 0.8; b.vx = 0; b.vy = 0; } });
        if (w.evo === "evo_hinano") o.onHit = (b, e) => { e.paintT = 5; e.paintEl = "thunder"; };
        if (w.evo === "evo_kokoha") o.onHit = (b, e) => { if (Math.random() < 0.12) E().zone({ x: e.x, y: e.y, r: 26, dur: 2, dmg: magOf(0.4), el: "fire", burn: 1, quiet: 1 }); };
        if (w.evo === "evo_kotori") o.onHit = (b, e) => { G().P.shield = Math.min(G().P.st.hp * 0.5, G().P.shield + 2); };
        if (w.evo === "evo_kumireina") o.onHit = (b, e) => { G().P.buffs.haste = { t: 1.5, v: 0.2 }; };
        if (w.evo === "evo_tome") o.onHit = (b, e) => { if (Math.random() < 0.08) { circleHit(b.x, b.y, 28, magOf(1.0), el, { src: "weapon" }); E().fx({ type: "ring", x: b.x, y: b.y, t: 0, dur: 0.3, r: 28, col: ec(el) }); } };
        w.orbs.push(o);
      }
    },
    dagger(P, w, L, evo) {
      const I = MA.Input;
      let a = Math.atan2(I.my, I.mx); if (!I.mx && !I.my) a = aim();
      const el = w.el;
      for (let i = 0; i < L.n; i++) G().queue.push({ at: G().t + i * 0.05, f: () => {
        const aa = a + (Math.random() - 0.5) * 0.4;
        lineHit(P.x, P.y - 3, aa, L.len, 8, atkOf(evo ? evo.mul : L.mul), el, { src: "weapon" });
        E().fx({ type: "thrust", x: P.x, y: P.y - 3, a: aa, len: L.len, t: 0, dur: 0.1, col: "#e8faff", col2: ec(el) });
        if (evo && w.evo === "evo_dagger") G().queue.push({ at: G().t + 0.15, f: () => lineHit(P.x, P.y - 3, aa, L.len * 1.2, 10, atkOf(evo.mul * 0.5), "shadow", { src: "weapon" }) });
        if (w.evo === "evo_azusa") shoot({ x: P.x, y: P.y - 3, a: aa, speed: 160, dmg: atkOf(0.6), el: "water", pierce: 3, life: 0.6, r: 4, kind: "petal", col: "#5a8cff", src: "weapon" });
      } });
      A().sfx("slash");
    },
    scythe(P, w, L, evo) {
      const el = w.el;
      for (let s = 0; s < L.spin; s++) G().queue.push({ at: G().t + s * 0.22, f: () => {
        circleHit(P.x, P.y - 2, L.r * P.st.area, atkOf(evo ? evo.mul : L.mul), el, { src: "weapon", kb: 10 });
        E().fx({ type: "spin", x: P.x, y: P.y - 2, r: L.r * P.st.area, t: 0, dur: 0.25, col: ec(el) });
        A().sfx("slash");
      } });
      if (evo && w.evo === "evo_scythe") E().zone({ x: P.x, y: P.y, r: 46, dur: 1.6, dmg: atkOf(0.35), el, pull: 1, quiet: 1, col: ec(el) });
      if (w.evo === "evo_reina") G().queue.push({ at: G().t + 0.45, f: () => { [0, Math.PI / 2].forEach((a) => { lineHit(P.x - Math.cos(a) * 80, P.y - Math.sin(a) * 80, a, 160, 14, atkOf(2.4), "shadow", { src: "weapon" }); E().fx({ type: "beam", x: P.x - Math.cos(a) * 80, y: P.y - Math.sin(a) * 80, a, len: 160, w: 10, t: 0, dur: 0.3, col: "#a874ff" }); }); } });
      if (w.evo === "evo_kagura") E().enemiesIn(P.x, P.y, L.r * P.st.area).slice(0, 3).forEach((e) => G().queue.push({ at: G().t + 0.4, f: () => { if (!e.dead) { circleHit(e.x, e.y, 26, atkOf(2.0), "fire", { src: "weapon", burn: 1 }); E().fx({ type: "bloom", x: e.x, y: e.y, t: 0, dur: 0.4, r: 26, col: "#ff3a46" }); } } }));
    },
    staff(P, w, L, evo) {
      const el = w.el;
      for (let i = 0; i < L.n; i++) {
        const a = aim() + (i - (L.n - 1) / 2) * 0.5;
        const b = shoot({ x: P.x, y: P.y - 6, a, speed: L.speed, dmg: magOf(evo ? evo.mul : L.mul), el, pierce: 0, life: 2.2, r: 3, kind: "magic", col: ec(el), src: "weapon", homing: 5 });
        if (evo && w.evo === "evo_staff") b.onHit = (bb, e) => { circleHit(e.x, e.y, 26, bb.dmg * 0.5, el, { src: "weapon", noChain: 1 }); E().chainFrom(e, 2, bb.dmg * 0.5, el); E().fx({ type: "ring", x: e.x, y: e.y, t: 0, dur: 0.25, r: 26, col: ec(el) }); };
        if (w.evo === "evo_hanon") { b.bounceN = 3; b.onHit = (bb, e) => { if (bb.bounceN-- > 0) { const nx = E().nearest(e.x, e.y, 120, (o) => o === e); if (nx) { const aa = Math.atan2(nx.y - e.y, nx.x - e.x); bb.vx = Math.cos(aa) * L.speed; bb.vy = Math.sin(aa) * L.speed; bb.pierce = 1; bb.life = 1; } } }; }
      }
      A().sfx("shot");
    },
  };

  /* ══ 魔法 ══ */
  function mLv(m) { return D().MAGICS[m.k].lv[Math.min(m.lv, 5) - 1]; }
  const MFIRE = {
    fireball(P, m, L) {
      for (let i = 0; i < L.n; i++) {
        const t = E().nearestN(P.x, P.y, 230, 6)[i] || E().nearest(P.x, P.y, 230);
        if (!t) return;
        const a = Math.atan2(t.y - P.y, t.x - P.x);
        const b = shoot({ x: P.x, y: P.y - 8, a, speed: 200, dmg: magOf(L.mul), el: "fire", pierce: 0, life: 1.6, r: 5, kind: "fireball", col: "#ff6a2a", src: "magic", burn: 1 });
        b.onHit = (bb, e) => { circleHit(e.x, e.y, L.r * P.st.area, magOf(L.mul * 0.6), "fire", { src: "magic", burn: 1, noChain: 1 }); E().fx({ type: "boom", x: e.x, y: e.y, t: 0, dur: 0.35, r: L.r * P.st.area, col: "#ff6a2a" }); A().sfx("boom"); };
      }
    },
    frost(P, m, L) {
      const t = E().nearest(P.x, P.y, 150);
      const x = t ? t.x : P.x, y = t ? t.y : P.y;
      E().zone({ x, y, r: L.r * P.st.area, dur: L.t, dmg: magOf(L.mul), el: "water", slow: 0.4, tick: 0.4, quiet: 1, col: "#9ae0ff", kind: "frost" });
      E().fx({ type: "ring", x, y, t: 0, dur: 0.4, r: L.r * P.st.area, col: "#9ae0ff" });
    },
    gale(P, m, L) {
      for (let i = 0; i < L.n; i++) { const a = i / L.n * TAU + G().t; shoot({ x: P.x, y: P.y - 4, a, speed: 200, dmg: magOf(L.mul), el: "wind", pierce: 3, life: 0.8, r: 4, kind: "blade", col: "#4fe39a", src: "magic", spin: 1, rehit: 0.2 }); }
      A().sfx("slash");
    },
    thunder(P, m, L) {
      E().nearestN(P.x, P.y, 220, L.n).forEach((t) => {
        E().damageEnemy(t, magOf(L.mul), { el: "thunder", src: "magic", noChain: 1 });
        E().chainFrom(t, L.chain, magOf(L.mul * 0.5), "thunder");
        E().fx({ type: "lightning", x: t.x, y: t.y, t: 0, dur: 0.25, col: "#ffd84a" });
      });
      A().sfx("zap");
    },
    holy(P, m, L) {
      for (let i = 0; i < L.n; i++) {
        const list = G().E.filter((e) => !e.dead && E().dist2(e.x, e.y, P.x, P.y) < 220 * 220);
        if (!list.length) return;
        /* いちばん敵が集まっている所 */
        let best = list[0], bn = 0;
        list.slice(0, 20).forEach((e) => { const n = E().enemiesIn(e.x, e.y, 30).length; if (n > bn) { bn = n; best = e; } });
        const x = best.x + (i ? (Math.random() - 0.5) * 40 : 0), y = best.y + (i ? (Math.random() - 0.5) * 40 : 0);
        E().telegraph({ shape: "circle", x, y, r: L.r * P.st.area, dur: 0.25, col: "#fff4b0", onFire: (o) => { circleHit(o.x, o.y, o.r, magOf(L.mul), "light", { src: "magic" }); E().fx({ type: "pillar", x: o.x, y: o.y, t: 0, dur: 0.45, r: o.r, col: "#fff4b0" }); } });
      }
    },
    shadowbind(P, m, L) {
      E().nearestN(P.x, P.y, 200, L.n).forEach((t, i) => G().queue.push({ at: G().t + i * 0.06, f: () => {
        if (t.dead) return;
        E().damageEnemy(t, magOf(L.mul), { el: "shadow", src: "magic", stun: 0.3 });
        E().heal(magOf(L.mul) * 0.02, true);
        E().fx({ type: "spikes", x: t.x, y: t.y, t: 0, dur: 0.4, col: "#a874ff" });
      } }));
    },
  };

  /* ══════════════════════════════════════════════════════════════
     毎フレーム
     ══════════════════════════════════════════════════════════════ */
  function update(dt) {
    const g = G(), P = g.P;
    if (!P.alive) return;
    const S = MA.Save.S;
    const A0 = P.C.atk;
    /* 通常攻撃（自動 or 押しているあいだ） */
    P.atkT -= dt;
    const want = S.set.autoAtk || P.atkHeld;
    if (want && P.atkT <= 0) {
      const near = E().nearest(P.x, P.y, 300);
      if (near || P.atkHeld) { (NORMAL[A0.kind] || NORMAL.shot)(P, A0); P.atkT = cdOf(A0.cd); P.atkAnim = 0.12; }
    }
    if (P.atkAnim > 0) P.atkAnim -= dt;
    /* 武器 */
    P.weapons.forEach((w) => {
      w.t -= dt;
      if (w.t > 0) return;
      const L = wLv(w);
      const evo = w.evo ? D().EVOS[w.evo] : null;
      if (!E().nearest(P.x, P.y, 320) && w.k !== "tome") { w.t = 0.2; return; }
      (WFIRE[w.k])(P, w, L, evo);
      w.t = cdOf(L.cd) * (evo ? 0.85 : 1);
    });
    /* 魔法 */
    P.magics.forEach((m) => {
      m.t -= dt;
      if (m.t > 0) return;
      const L = mLv(m);
      if (!E().nearest(P.x, P.y, 260)) { m.t = 0.3; return; }
      (MFIRE[m.k])(P, m, L);
      m.t = mcdOf(L.cd);
    });
    /* 共鳴の効果（時間で出るもの） */
    resUpdate(dt);
    /* 分身・幻影・音符 */
    summons(dt);
    /* バフの残り（ヒナノの翠風） */
    if (P.chainT > 0) P.chainT -= dt;
    if (P.heat > 0 && !P.atkHeld && !S.set.autoAtk) P.heat = Math.max(0, P.heat - dt * 0.5);
    if (P.wall) { P.wall.t -= dt; if (P.wall.t <= 0) P.wall = null; else { P.wall.x = P.x + Math.cos(P.wall.a) * 18; P.wall.y = P.y + Math.sin(P.wall.a) * 18; P.wall.a = aim(); } }
  }

  /* ══ 分身（レイナ）・幻影（ムツミ）・音符（クミコ＆レイナ）・精霊（精霊の鈴） ══ */
  function summons(dt) {
    const P = G().P;
    P.clones = P.clones.filter((c) => (c.t -= dt) > 0);
    P.clones.forEach((c, i) => {
      const ox = P.x + Math.cos(G().t * 1.4 + i * 3) * 26, oy = P.y + Math.sin(G().t * 1.4 + i * 3) * 18;
      c.x += (ox - c.x) * Math.min(1, dt * 6); c.y += (oy - c.y) * Math.min(1, dt * 6);
      c.cd -= dt;
      if (c.cd <= 0) {
        const t = E().nearest(c.x, c.y, 200); if (!t) return;
        const a = Math.atan2(t.y - c.y, t.x - c.x);
        const b = shoot({ x: c.x, y: c.y - 6, a, speed: 150, dmg: atkOf(P.C.atk.mul * c.mul) * P.st.mag, el: "shadow", pierce: 0, life: 1.6, r: 4, kind: "orb", col: "#a874ff", src: "summon", homing: 3 });
        b.onHit = (bb, e) => E().chainFrom(e, 1, bb.dmg * 0.5, "shadow");
        c.cd = 0.7;
      }
    });
    P.mirage = P.mirage.filter((m) => (m.t -= dt) > 0);
    P.mirage.forEach((m) => {
      m.cd -= dt;
      if (m.cd <= 0) { const t = E().nearest(m.x, m.y, 60); const a = t ? Math.atan2(t.y - m.y, t.x - m.x) : m.a; slashArc(m.x, m.y, a, P.C.atk.r * 1.2, P.C.atk.arc, atkOf(P.C.atk.mul * 0.7), "fire", { src: "summon" }); m.cd = cdOf(P.C.atk.cd); }
    });
    /* 音符（いつも1つ＋ファンファーレ・共鳴で増える） */
    const want = (P.C.passive.kind === "duo" ? 1 : 0) + (P.buffs.fanfare ? P.C.skill.notes : 0) + (P.resSummon || 0) + (P.st.summon || P.base.summon ? 1 : 0);
    while (P.notes.length < want) P.notes.push({ a: Math.random() * TAU, cd: 0 });
    if (P.notes.length > want) P.notes.length = want;
    P.notes.forEach((n, i) => {
      n.a += dt * 2.2;
      n.x = P.x + Math.cos(n.a + i * TAU / Math.max(1, P.notes.length)) * 30; n.y = P.y - 6 + Math.sin(n.a + i * TAU / Math.max(1, P.notes.length)) * 22;
      n.cd -= dt;
      if (n.cd <= 0) {
        const t = E().nearest(n.x, n.y, 170); if (!t) return;
        const el = P.C.el2 && i % 2 ? P.C.el2 : (P.C.el === "water" ? "wind" : P.C.el);
        shoot({ x: n.x, y: n.y, a: Math.atan2(t.y - n.y, t.x - n.x), speed: 190, dmg: atkOf(0.7) * P.st.mag, el, pierce: 0, life: 1.2, r: 3, kind: "note", col: ec(el), src: "summon", homing: 4 });
        n.cd = 1.0;
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     固有スキル（Q）
     ══════════════════════════════════════════════════════════════ */
  const SKILL = {
    ripple(P, K) {
      const r = K.r * P.st.area;
      circleHit(P.x, P.y, r, skillOf(K.mul), "water", { src: "skill", slow: 0.3 });
      for (let i = 0; i < 3; i++) E().fx({ type: "ring", x: P.x, y: P.y, t: -i * 0.06, dur: 0.4, r: r * (0.55 + i * 0.22), col: i % 2 ? "#e0f2ff" : "#7fb8ff" });
      E().nearestN(P.x, P.y, 260, K.drops).forEach((e, i) => G().queue.push({ at: G().t + 0.08 * i, f: () => {
        if (e.dead) return;
        E().fx({ type: "bolt", x: P.x, y: P.y - 6, x2: e.x, y2: e.y, t: 0, dur: 0.2, col: "#a9a4ff" });
        E().damageEnemy(e, skillOf(K.dropMul), { el: "water", src: "skill" });
        e.defDownT = 4;
        E().fx({ type: "bloom", x: e.x, y: e.y, t: 0, dur: 0.35, r: 14, col: "#6f6cff" });
      } }));
      P.ultG = Math.min(100, P.ultG + 8);
    },
    paint(P, K) {
      const r = K.r * P.st.area;
      E().enemiesIn(P.x, P.y, r).forEach((e) => { e.paintT = K.t; e.paintEl = "thunder"; e.vulT = K.t; e.vulK = K.vul; E().damageEnemy(e, skillOf(K.mul), { el: "wind", src: "skill" }); });
      E().fx({ type: "prism", x: P.x, y: P.y, t: 0, dur: 0.5, r, col: "#4fe39a" });
    },
    dunk(P, K) {
      const t = E().nearest(P.x, P.y, 160);
      const x = t ? t.x : P.x + Math.cos(aim()) * 60, y = t ? t.y : P.y + Math.sin(aim()) * 60;
      E().telegraph({ shape: "circle", x, y, r: K.r * P.st.area, dur: 0.3, col: "#ffe08a", onFire: (o) => { circleHit(o.x, o.y, o.r, skillOf(K.mul), "light", { src: "skill", kb: 14 }); E().fx({ type: "hoop", x: o.x, y: o.y, t: 0, dur: 0.5, r: o.r, col: "#ffd84a" }); A().sfx("boom"); G().shake = 4; } });
      P.buffs.haste = { t: K.t, v: K.haste };
    },
    rainzone(P, K) {
      const t = E().nearest(P.x, P.y, 160);
      const x = t ? t.x : P.x + Math.cos(aim()) * 50, y = t ? t.y : P.y + Math.sin(aim()) * 50;
      E().zone({ x, y, r: K.r * P.st.area, dur: K.t, dmg: skillOf(K.mul), el: "fire", burn: 1, tick: 0.25, quiet: 1, col: "#ff3a5a", kind: "rain", gauge: 1 });
    },
    mirage(P, K) {
      const a = aim();
      const sx = P.x, sy = P.y;
      E().moveCircle(P, Math.cos(a) * K.dist, Math.sin(a) * K.dist, true);
      lineHit(sx, sy, a, K.dist, 22, skillOf(K.mul), "fire", { src: "skill" });
      E().fx({ type: "afterimage", x: sx, y: sy, x2: P.x, y2: P.y, t: 0, dur: 0.35, col: "#ff6a3d" });
      P.iT = Math.max(P.iT, 0.3);
      P.mirage.push({ x: sx, y: sy, a, t: K.t, cd: 0 });
    },
    clone(P, K) { P.clones.push({ x: P.x, y: P.y, t: K.t, cd: 0, mul: K.mul }); E().fx({ type: "poof", x: P.x, y: P.y, t: 0, dur: 0.4, col: "#a874ff", r: 14 }); },
    waltz(P, K) {
      const a = aim();
      const sx = P.x, sy = P.y;
      E().moveCircle(P, Math.cos(a) * K.dist, Math.sin(a) * K.dist, true);
      lineHit(sx, sy, a, K.dist, 28, skillOf(K.mul), "water", { src: "skill" });
      for (let i = 0; i < 5; i++) { const t = i / 4; E().zone({ x: sx + (P.x - sx) * t, y: sy + (P.y - sy) * t, r: 14, dur: 2, dmg: skillOf(0.3), el: "water", quiet: 1, col: "#5a8cff", kind: "petals" }); }
      E().fx({ type: "afterimage", x: sx, y: sy, x2: P.x, y2: P.y, t: 0, dur: 0.35, col: "#5a8cff" });
      P.iT = Math.max(P.iT, 0.45);
      onDashEnd();
    },
    fanfare(P, K) { P.buffs.fanfare = { t: K.t, a: K.aspd, v: K.dmg }; E().fx({ type: "notes", x: P.x, y: P.y, t: 0, dur: 0.8, col: "#ff8fd0" }); },
    slashwave(P, K) {
      const a = aim();
      shoot({ x: P.x, y: P.y - 4, a, speed: K.speed, dmg: skillOf(K.mul), el: "fire", pierce: 99, life: K.range / K.speed, r: 12, kind: "crescentShot", col: "#ff3a46", src: "skill", kb: 10 });
    },
    wall(P, K) {
      if (K.mul) circleHit(P.x, P.y, (K.r || 64) * P.st.area, skillOf(K.mul), "water", { src: "skill", kb: 16 });
      P.shield = Math.max(P.shield, Math.round(P.st.hp * K.shield * (1 + (P.st.skill || 0))));
      P.wall = { a: aim(), x: P.x, y: P.y, t: K.t, len: 46 };
      E().fx({ type: "ring", x: P.x, y: P.y, t: 0, dur: 0.4, r: 22, col: "#7fd0ff" });
    },
  };
  function skill() {
    const P = G().P, K = P.C.skill;
    if (!P.alive) return;
    if (P.skillCd > 0) return;
    if (P.mp < K.mp) { E().pop(P.x, P.y - 24, "MPが足りない", "#9ab0ff"); A().sfx("error"); return; }
    P.mp -= K.mp;
    P.skillCd = K.cd * (1 - P.st.cdr);
    (SKILL[K.kind] || (() => {}))(P, K);
    E().pop(P.x, P.y - 26, K.nm, ec(P.C.el));
    A().sfx("skill");
  }
  /* ══ 星脈解放（E・共通）：キャラの属性の大きな衝撃 ══ */
  function burst() {
    const P = G().P;
    if (!P.alive || P.burstCd > 0) return;
    if (P.mp < 40) { E().pop(P.x, P.y - 24, "MPが足りない", "#9ab0ff"); A().sfx("error"); return; }
    P.mp -= 40; P.burstCd = 4 * (1 - P.st.cdr);
    const el = P.C.el, r = 110 * P.st.area;
    E().enemiesIn(P.x, P.y, r).forEach((e) => {
      E().damageEnemy(e, skillOf(3.0), { el, src: "skill", kb: 18, kx: e.x - P.x, ky: e.y - P.y, burn: el === "fire", slow: el === "water" ? 0.4 : 0, stun: el === "thunder" ? 0.6 : 0 });
    });
    if (el === "light") E().heal(P.st.hp * 0.08);
    if (el === "wind") P.buffs.gale = { t: 3, v: 0.3, re: 0 };
    for (let i = 0; i < 3; i++) E().fx({ type: "ring", x: P.x, y: P.y, t: -i * 0.07, dur: 0.45, r: r * (0.5 + i * 0.25), col: i % 2 ? ec2(el) : ec(el) });
    G().shake = 6;
    E().pop(P.x, P.y - 26, "星脈解放", ec(el));
    A().sfx("boom");
  }

  /* ══════════════════════════════════════════════════════════════
     必殺技（R）
     ══════════════════════════════════════════════════════════════ */
  const ULT = {
    suitenka(P, U) {
      /* いちばん強い敵へ蒼い雫を連射 → 画面全体へ蒼い桔梗の大輪＋防御ダウン */
      for (let i = 0; i < U.n; i++) G().queue.push({ at: G().t + i * 0.018, f: () => {
        const t = E().strongest(P.x, P.y, 300) || E().nearest(P.x, P.y, 300); if (!t) return;
        const a = Math.atan2(t.y - P.y, t.x - P.x) + (Math.random() - 0.5) * 0.25;
        shoot({ x: P.x, y: P.y - 6, a, speed: 420, dmg: ultOf(U.mul), el: "water", pierce: 1, life: 0.9, r: 3, kind: "bullet", col: i % 3 ? "#7fd8ff" : "#ffffff", src: "ult", homing: 6, tgt: t });
        if (i % 4 === 0) A().sfx("shot");
      } });
      G().queue.push({ at: G().t + U.n * 0.018 + 0.25, f: () => {
        const cx = G().cam.x, cy = G().cam.y;
        G().E.forEach((e) => { if (!e.dead && Math.abs(e.x - cx) < G().vw / 2 + 20 && Math.abs(e.y - cy) < G().vh / 2 + 20) { E().damageEnemy(e, ultOf(U.fin), { el: "water", src: "ult" }); e.defDownT = 6; } });
        E().fx({ type: "bellflower", x: cx, y: cy, t: 0, dur: 1.1, col: "#6f6cff" });
        G().flash = 0.8; G().flashCol = "#bfe8ff"; G().shake = 10;
        A().sfx("boom");
      } });
    },
    tempest(P, U) {
      for (let i = 0; i < U.n; i++) G().queue.push({ at: G().t + i * 0.04, f: () => { const a = i * 0.55; shoot({ x: P.x, y: P.y - 4, a, speed: 200, dmg: ultOf(U.mul), el: "wind", pierce: 6, life: 1.4, r: 5, kind: "blade", col: "#4fe39a", src: "ult", spin: 1, curve: 1.2 }); } });
      G().E.forEach((e) => { if (!e.dead && E().dist2(e.x, e.y, P.x, P.y) < 260 * 260) { e.paintT = 8; e.paintEl = "thunder"; } });
      E().fx({ type: "prism", x: P.x, y: P.y, t: 0, dur: 1.0, r: 200, col: "#4fe39a" });
    },
    buzzer(P, U) {
      for (let i = 0; i < U.n; i++) G().queue.push({ at: G().t + i * 0.12, f: () => {
        const t = E().nearestN(P.x, P.y, 280, U.n)[i % 6] || E().nearest(P.x, P.y, 280); if (!t) return;
        E().telegraph({ shape: "circle", x: t.x, y: t.y, r: 28, dur: 0.3, col: "#ffd84a", onFire: (o) => { circleHit(o.x, o.y, o.r, ultOf(U.mul), "light", { src: "ult" }); E().fx({ type: "hoop", x: o.x, y: o.y, t: 0, dur: 0.4, r: 28, col: "#ffd84a" }); A().sfx("boom"); } });
      } });
      G().queue.push({ at: G().t + U.n * 0.12 + 0.4, f: () => { screenHit(ultOf(U.fin), "light"); E().fx({ type: "flashring", x: G().cam.x, y: G().cam.y, t: 0, dur: 0.8, col: "#fff4b0" }); G().flash = 0.6; G().flashCol = "#fff4b0"; } });
    },
    senka(P, U) {
      const cx = G().cam.x, cy = G().cam.y;
      E().zone({ x: cx, y: cy, r: Math.max(G().vw, G().vh), dur: U.t, dmg: ultOf(U.mul), el: "fire", burn: 1, tick: 0.25, quiet: 1, col: "#ff3a5a", kind: "bigrain" });
      G().queue.push({ at: G().t + U.t, f: () => { screenHit(ultOf(U.fin), "fire"); E().fx({ type: "bloom", x: G().cam.x, y: G().cam.y, t: 0, dur: 0.9, r: 160, col: "#ff3a5a" }); G().flash = 0.6; G().flashCol = "#ffb0b8"; } });
    },
    ignite(P, U) {
      circleHit(P.x, P.y, U.r, ultOf(U.mul), "fire", { src: "ult", burn: 1, kb: 20 });
      E().fx({ type: "firering", x: P.x, y: P.y, t: 0, dur: 0.7, r: U.r, col: "#ff6a3d" });
      for (let i = 0; i < U.clones; i++) { const a = i / U.clones * TAU; P.mirage.push({ x: P.x + Math.cos(a) * 30, y: P.y + Math.sin(a) * 30, a, t: 5, cd: 0 }); }
      G().shake = 8;
    },
    cross(P, U) {
      const cx = G().cam.x, cy = G().cam.y;
      [Math.PI / 4, -Math.PI / 4].forEach((a) => { lineHit(cx - Math.cos(a) * 260, cy - Math.sin(a) * 260, a, 520, 40, ultOf(U.mul), "shadow", { src: "ult" }); E().fx({ type: "beam", x: cx - Math.cos(a) * 260, y: cy - Math.sin(a) * 260, a, len: 520, w: 30, t: 0, dur: 0.6, col: "#a874ff" }); });
      P.clones.push({ x: P.x - 20, y: P.y, t: 8, cd: 0, mul: 0.7 }, { x: P.x + 20, y: P.y, t: 8, cd: 0.3, mul: 0.7 });
      G().flash = 0.5; G().flashCol = "#d0b0ff"; G().shake = 10;
    },
    rondo(P, U) {
      for (let i = 0; i < U.n; i++) G().queue.push({ at: G().t + i * 0.035, f: () => {
        const list = E().enemiesIn(P.x, P.y, U.r); if (!list.length) return;
        const e = list[i % list.length];
        E().damageEnemy(e, ultOf(U.mul), { el: "water", src: "ult", noFx: i % 2 });
        E().fx({ type: "petalburst", x: e.x, y: e.y, t: 0, dur: 0.25, col: "#5a8cff" });
        if (i % 3 === 0) A().sfx("slash");
      } });
      G().queue.push({ at: G().t + U.n * 0.035 + 0.2, f: () => { circleHit(P.x, P.y, U.r, ultOf(U.fin), "water", { src: "ult" }); E().fx({ type: "bloom", x: P.x, y: P.y, t: 0, dur: 0.8, r: U.r, col: "#3a63ea" }); G().flash = 0.4; G().flashCol = "#bcd8ff"; } });
      P.iT = Math.max(P.iT, 1.5);
    },
    duet(P, U) {
      for (let i = 0; i < U.pulses; i++) G().queue.push({ at: G().t + i * 0.35, f: () => { screenHit(ultOf(U.mul), i % 2 ? "light" : "fire"); E().fx({ type: "flashring", x: P.x, y: P.y, t: 0, dur: 0.5, col: i % 2 ? "#fff4b0" : "#ff8a5a" }); A().sfx("boom"); } });
      E().heal(P.st.hp * U.heal);
    },
    senrin(P, U) {
      for (let i = 0; i < U.n; i++) G().queue.push({ at: G().t + i * 0.025, f: () => {
        const list = E().enemiesIn(P.x, P.y, U.r); if (!list.length) return;
        const e = list[i % list.length];
        E().damageEnemy(e, ultOf(U.mul), { el: "fire", src: "ult", noFx: i % 2 });
        E().fx({ type: "slashmark", x: e.x, y: e.y, a: Math.random() * TAU, t: 0, dur: 0.2, col: "#ff3a46" });
        if (i % 3 === 0) A().sfx("slash");
      } });
      G().queue.push({ at: G().t + U.n * 0.025 + 0.2, f: () => { circleHit(P.x, P.y, U.r, ultOf(U.fin), "fire", { src: "ult", burn: 1 }); E().fx({ type: "bloom", x: P.x, y: P.y, t: 0, dur: 0.8, r: U.r, col: "#ff3a46" }); G().flash = 0.4; G().flashCol = "#ffb0b0"; } });
      P.iT = Math.max(P.iT, 1.5);
    },
    slam(P, U) {
      circleHit(P.x, P.y, U.r, ultOf(U.mul), "water", { src: "ult", kb: 30 });
      E().fx({ type: "shock", x: P.x, y: P.y, t: 0, dur: 0.6, r: U.r, col: "#3fa9ff" });
      E().heal(P.st.hp * U.heal);
      P.shield = Math.max(P.shield, Math.round(P.st.hp * 0.3));
      G().shake = 12;
    },
  };
  function screenHit(dmg, el) {
    const cx = G().cam.x, cy = G().cam.y;
    G().E.forEach((e) => { if (!e.dead && Math.abs(e.x - cx) < G().vw / 2 + 20 && Math.abs(e.y - cy) < G().vh / 2 + 20) E().damageEnemy(e, dmg, { el, src: "ult" }); });
  }
  function ult() {
    const P = G().P, U = P.C.ult;
    if (!P.alive) return;
    if (P.ultG < 100) { E().pop(P.x, P.y - 24, "ゲージ " + Math.floor(P.ultG) + "%", "#ff8fd0"); return; }
    P.ultG = 0;
    G().ultCut = { t: 0, nm: U.nm, cid: P.cid };
    (ULT[U.kind] || (() => {}))(P, U);
    A().sfx("ult");
    G().slow = 0.25;
  }

  /* ══ キャラのパッシブの入口 ══ */
  function onDash() {
    const P = G().P;
    if (P.C.passive.kind === "focus") P.focus = P.C.passive.crits + (P.st.passive ? 1 : 0);
    if (P.C.passive.kind === "afterdash") P.buffs.afterdash = { t: P.C.passive.t, v: P.C.passive.aspd + (P.st.passive ? 0.15 : 0) };
    P.dashTrail = true;
  }
  function onDashEnd() { const P = G().P; P.dashTrail = false; }
  function onHit(e, d, el, opt) {
    const P = G().P;
    P.resFx.forEach((fx) => {
      if (fx.t !== "chain") return;
      if (Math.random() < fx.chance) {
        const list = E().nearestN(e.x, e.y, 100, fx.n + 1).filter((o) => o !== e).slice(0, fx.n);
        list.forEach((o) => { E().fx({ type: "bolt", x: e.x, y: e.y, x2: o.x, y2: o.y, t: 0, dur: 0.15, col: ec(fx.el) }); E().damageEnemy(o, P.st.atk * fx.mul, { el: fx.el, fromChain: 1, noCrit: 1, slow: fx.slow || 0, stun: fx.stun || 0 }); });
      }
    });
  }
  function onKill(e, el) {
    const P = G().P;
    if (P.C.passive.kind === "galestep") { P.buffs.gale = { t: P.C.passive.t, v: Math.min(P.C.passive.max, ((P.buffs.gale && P.buffs.gale.v) || 0) / P.C.passive.stack + 1) * P.C.passive.stack }; }
    if (P.C.passive.kind === "chainkill") P.chainT = P.C.passive.t + (P.st.passive ? 1 : 0);
    if (P.C.passive.kind === "spreadburn" && e.burnT > 0) { E().enemiesIn(e.x, e.y, 40).forEach((o) => { o.burnT = 3; o.burnDps = Math.max(o.burnDps || 0, e.burnDps || P.st.atk * 0.3); }); E().fx({ type: "boom", x: e.x, y: e.y, t: 0, dur: 0.3, r: 40, col: "#ff5a3c" }); }
  }

  /* ══════════════════════════════════════════════════════════════
     星脈共鳴：タグを集めて、条件を満たした共鳴を発動
     ══════════════════════════════════════════════════════════════ */
  function refreshTags() {
    const P = G().P, S = MA.Save.S;
    const tags = new Set();
    const els = new Set();
    tags.add("char:" + P.cid); tags.add("ctype:" + P.C.type);
    els.add(P.C.el); if (P.C.el2) els.add(P.C.el2);
    P.weapons.forEach((w) => { tags.add("weapon:" + w.k); tags.add("weapon:" + w.k + ":" + w.el); els.add(w.el); });
    P.magics.forEach((m) => { tags.add("magic:" + m.k); els.add(D().MAGICS[m.k].el); });
    Object.keys(P.passives).forEach((k) => { tags.add("stat:" + k); const s = D().STATS[k]; if (s && s.el) { tags.add("seal:" + s.el); els.add(s.el); } });
    if (!(G().cfg && G().cfg.trial)) MA.Stats.gearOf(P.cid, S).forEach((g) => { const gd = D().GEAR[g.id]; tags.add("equip:" + gd.slot + ":" + (gd.tag || g.id)); if (gd.el) els.add(gd.el); });
    els.forEach((el) => tags.add("el:" + el));
    tags.add("count:weapon:" + P.weapons.length); for (let n = 1; n <= P.weapons.length; n++) tags.add("count:weapon:" + n);
    for (let n = 1; n <= P.magics.length; n++) tags.add("count:magic:" + n);
    for (let n = 1; n <= els.size; n++) tags.add("count:el:" + n);
    P.tags = tags;
    /* 共鳴の判定 */
    const before = new Set(P.res);
    const active = D().RESONANCES.filter((r) => r.req.every((alts) => alts.some((t) => tags.has(t))));
    P.res = new Set(active.map((r) => r.id));
    P.resFx = [];
    P.resSummon = 0;
    active.forEach((r) => r.fx.forEach((f) => { P.resFx.push(Object.assign({ res: r.id, cdT: 0 }, f)); if (f.t === "summon") P.resSummon += f.n; }));
    /* 新しく発動した共鳴 */
    active.forEach((r) => {
      if (before.has(r.id)) return;
      S.codex.res[r.id] = (S.codex.res[r.id] || 0) + 1;
      S.stats.resonances++;
      MA.Save.misAdd("resonances", 1);
      G().stats.res.push(r.id);
      E().ach("res1");
      if (Object.keys(S.codex.res).length >= 10) E().ach("res10");
      if (Object.keys(S.codex.res).length >= D().RESONANCES.length) E().ach("resAll");
      A().sfx("reso");
      MA.UI && MA.UI.resonance && MA.UI.resonance(r);
      E().fx({ type: "reso", x: P.x, y: P.y, t: 0, dur: 1.0, col: r.c });
    });
    /* オービット型は作り直す */
    (P.resOrbs || []).forEach((o) => { o.life = 0; });
    P.resOrbs = [];
    P.resFx.forEach((f) => {
      if (f.t !== "orbit") return;
      for (let i = 0; i < f.n; i++) {
        P.resOrbs.push(E().pbullet({ x: P.x, y: P.y, vx: 0, vy: 0, dmg: 0, mulRef: f.mul, el: f.el, pierce: 999, life: 1e9, r: 6, kind: "resorb", col: ec(f.el), src: "res", rehit: 0.4, ghost: true, ang: i / f.n * TAU, rad: f.r, spin: f.spin,
          update: (b, dt) => { b.ang += dt * b.spin; b.x = G().P.x + Math.cos(b.ang) * b.rad; b.y = G().P.y - 4 + Math.sin(b.ang) * b.rad * 0.8; b.dmg = G().P.st.atk * b.mulRef; } }));
      }
    });
  }
  function resUpdate(dt) {
    const P = G().P;
    P.resFx.forEach((f) => {
      if (f.t === "nova") { f.cdT -= dt; if (f.cdT <= 0) { f.cdT = f.cd; const r = f.r * P.st.area; circleHit(P.x, P.y, r, P.st.atk * f.mul, f.el, { src: "res", kb: f.pull ? 0 : 8 }); if (f.pull) E().zone({ x: P.x, y: P.y, r, dur: 1.2, dmg: P.st.atk * 0.2, el: f.el, pull: 1, quiet: 1, col: ec(f.el) }); E().fx({ type: "ring", x: P.x, y: P.y, t: 0, dur: 0.4, r, col: ec(f.el) }); } }
      if (f.t === "rain") { f.cdT -= dt; if (f.cdT <= 0) { f.cdT = f.cd; E().nearestN(P.x, P.y, 230, f.n).forEach((e) => { E().telegraph({ shape: "circle", x: e.x, y: e.y, r: 18, dur: 0.25, col: ec(f.el), onFire: (o) => { circleHit(o.x, o.y, o.r, P.st.atk * f.mul, f.el, { src: "res" }); E().fx({ type: f.el === "thunder" ? "lightning" : "pillar", x: o.x, y: o.y, t: 0, dur: 0.3, r: 18, col: ec(f.el) }); } }); }); } }
      if (f.t === "aura") { f.cdT -= dt; if (f.cdT <= 0) { f.cdT = 0.5; E().enemiesIn(P.x, P.y, f.r).forEach((e) => E().damageEnemy(e, P.st.atk * f.mul, { el: f.el, src: "res", slow: f.slow || 0, noFx: 1, noGauge: 1 })); } }
      if (f.t === "trail" && (P.dashTrail || f.always)) { f.cdT -= dt; if (f.cdT <= 0) { f.cdT = f.always ? 0.35 : 0.05; if (f.always && !P.moving) return; E().zone({ x: P.x, y: P.y, r: 14, dur: 1.6, dmg: P.st.atk * f.mul * 0.4, el: f.el, tick: 0.3, quiet: 1, col: ec(f.el), kind: "trail" }); } }
    });
  }

  MA.W = { update, skill, burst, ult, onDash, onDashEnd, onHit, onKill, refreshTags, NORMAL, WFIRE, MFIRE, SKILL, ULT, slashArc, circleHit, lineHit, shoot, screenHit, atkOf, magOf };
})();
