/* ============================================================
   MagiDerby — コースの絵とレースの再現（★★ 2026-10-21）
   ------------------------------------------------------------
   ・コースの形は「1周の長さ・最後の直線」から作った陸上トラック形（実際の形の目安）。
   ・再現アニメーションは<b>実際のデータ</b>（ラップ・コーナー通過順位（馬身差の記号つき）・着差・上がり）から、
     各馬の位置をなめらかにつないだもの。映像そのものではないので、画面には「再現（目安）」と出す。
       コーナー通過順位の記号：「,」1〜2馬身／「-」2〜5馬身／「=」5馬身以上／「( )」1馬身未満で並ぶ（内から）／「*」並びの先頭
   ・馬は1頭ずつ手で描く（毛色・枠の色の帽子・ゼッケン）。
   ============================================================ */
(function () {
  "use strict";
  const D = window.MD_DATA, N = window.MD_NET;
  const RC = (window.MD_RACE = {});
  const LEN = 2.4;                       /* 1馬身（m） */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ss = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };

  /* ══════════ コースの形 ══════════ */
  RC.layout = function (race) {
    const C0 = D.COURSES[race.place] || { lap: { 芝: 1800, ダ: 1600 }, st: { 芝: 400, ダ: 380 }, dir: "右" };
    const outer = /外/.test(race.dir || "");
    const sk = race.surf === "ダ" ? "ダ" : outer ? "芝外" : "芝内";
    const L = C0.lap[sk] || C0.lap[race.surf === "ダ" ? "ダ" : "芝"] || C0.lap["芝内"] || 1800;
    const S = C0.st[sk] || C0.st[race.surf === "ダ" ? "ダ" : "芝"] || C0.st["芝外"] || 400;
    const St = S + 110;
    const C = Math.max(260, (L - 2 * St) / 2);
    const left = String(race.dir || C0.dir || "右").indexOf("左") >= 0;
    return { L: L, S: S, St: St, C: C, R: C / Math.PI, h: St / 2, left: left, outer: outer };
  };
  /* ゴールから走る向きに s メートル進んだ点（ホームの直線が下・左回りは左→右） */
  RC.pt = function (lay, s) {
    const L = lay.L; s = ((s % L) + L) % L;
    const R = lay.R, h = lay.h, a = lay.St - lay.S, C = lay.C, St = lay.St, xf = -h + lay.S;
    let x, y;
    if (s < a) { x = xf + s; y = R; }
    else if (s < a + C) { const t = (s - a) / R; x = h + R * Math.sin(t); y = R * Math.cos(t); }
    else if (s < a + C + St) { x = h - (s - a - C); y = -R; }
    else if (s < a + 2 * C + St) { const t = (s - a - C - St) / R; x = -h - R * Math.sin(t); y = -R * Math.cos(t); }
    else { x = -h + (s - a - 2 * C - St); y = R; }
    if (!lay.left) x = -x;
    return { x: x, y: y };
  };
  /* 通過順を数えるコーナー（スタートからの距離・最後の4つまで） */
  RC.cornerDists = function (race, lay) {
    lay = lay || RC.layout(race);
    const a = lay.St - lay.S, C = lay.C, St = lay.St, L = lay.L, Dd = race.dist;
    const sk = [a + C / 4, a + 3 * C / 4, a + C + St + C / 4, a + C + St + 3 * C / 4];
    const out = [];
    for (let lap = 0; lap < 3; lap++) sk.forEach((s, i) => { const b = L - s + lap * L; if (b < Dd - 120) out.push({ k: i + 1, d: Dd - b }); });
    out.sort((x, y) => x.d - y.d);
    return out.slice(-4);
  };

  /* ══════════ データの読みかえ ══════════ */
  RC.parseT = function (s) {
    const t = String(s || "").trim(); if (!t) return 0;
    const m = t.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/); if (!m) return 0;
    return (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2]);
  };
  RC.marginL = function (m) {
    const t = String(m || "").trim(); if (!t) return 0;
    const map = { "同着": 0, "ハナ": 0.05, "アタマ": 0.12, "クビ": 0.25, "大差": 12, "大": 12 };
    if (t in map) return map[t];
    const mm = t.match(/^(\d+)?(?:\.?(\d)\/(\d))?$/);
    if (mm && (mm[1] || mm[2])) return (mm[1] ? Number(mm[1]) : 0) + (mm[2] ? Number(mm[2]) / Number(mm[3]) : 0);
    const f = parseFloat(t); return isFinite(f) ? f : 0.5;
  };
  /* コーナー通過順位の文字 → [{no, gapL（先頭からの馬身）, lane（0＝内）, grp}] */
  RC.parseCorner = function (s) {
    const out = []; if (!s) return out;
    const SEP = { ",": 1.5, "-": 3.2, "=": 6.5 };
    let g = 0, i = 0, sep = null, first = true;
    const step = () => { if (!first) g += sep != null ? SEP[sep] : 0.6; sep = null; first = false; };
    while (i < s.length) {
      const ch = s[i];
      if (SEP[ch] != null) { sep = ch; i++; continue; }
      if (ch === "(") {
        const j = s.indexOf(")", i), inner = s.slice(i + 1, j < 0 ? s.length : j);
        step();
        const items = inner.split(",").map((x) => x.trim()).filter(Boolean);
        items.forEach((it, k) => { const star = it[0] === "*"; const no = parseInt(it.replace("*", ""), 10); if (isFinite(no)) out.push({ no: no, gapL: g + (star || items.length === 1 ? 0 : 0.3), lane: 0.1 + k * 0.17, grp: items.length }); });
        i = j < 0 ? s.length : j + 1; continue;
      }
      const m = /^\*?\d+/.exec(s.slice(i));
      if (m) { step(); out.push({ no: parseInt(m[0].replace("*", ""), 10), gapL: g, lane: -1, grp: 1 }); i += m[0].length; continue; }
      i++;
    }
    /* 1頭で走っている馬はラチ沿い（同じくらいの位置に何頭かいれば少しずつ外へ） */
    out.forEach((x) => { if (x.lane < 0) { const near = out.filter((y) => y !== x && y.lane >= 0 && Math.abs(y.gapL - x.gapL) < 0.8).length; x.lane = 0.1 + Math.min(near, 3) * 0.12; } });
    return out;
  };

  /* ══════════ 再現のモデル ══════════ */
  RC.model = function (race) {
    const res = race && race.result;
    if (!res || !res.rows || !res.rows.length) return null;
    const Dd = race.dist, lay = RC.layout(race);
    const rows = res.rows.filter((x) => !/取消|除外/.test(x.pos));
    const n = rows.length;
    const fin = rows.filter((x) => isFinite(parseInt(x.pos, 10))).sort((a, b) => parseInt(a.pos, 10) - parseInt(b.pos, 10));
    const T1 = RC.parseT(fin[0] && fin[0].time);
    /* 先頭のラップ（何m地点で何秒か） */
    const lp = res.laps || {}, ds0 = (lp.d || []).map(Number), cum0 = ((lp.rows || [])[0] || []).map(RC.parseT);
    let ds = [], cum = [];
    if (ds0.length && ds0.length === cum0.length && cum0.every((x, i) => x > 0 && (i === 0 || x > cum0[i - 1]))) { ds = ds0; cum = cum0; }
    else { const T = T1 || Dd / 16.4; for (let d = 200; d <= Dd; d += 200) { ds.push(d); cum.push(T * d / Dd); } if (ds[ds.length - 1] !== Dd) { ds.push(Dd); cum.push(T); } }
    const LD = [0].concat(ds), LT = [0].concat(cum);
    const Tend = LT[LT.length - 1];
    const vEnd = (LD[LD.length - 1] - LD[LD.length - 2]) / Math.max(0.5, LT[LT.length - 1] - LT[LT.length - 2]);
    const leadD = function (t) {
      if (t <= 0) return 0;
      if (t >= Tend) return Dd + (t - Tend) * vEnd;
      let k = 1; while (k < LT.length && LT[k] < t) k++;
      const t0 = LT[k - 1], t1 = LT[k];
      /* スタート直後はゆっくり加速（最初の区間だけ二次で） */
      const u = (t - t0) / (t1 - t0);
      if (k === 1) return LD[1] * u * (0.55 + 0.45 * u);
      return LD[k - 1] + (LD[k] - LD[k - 1]) * u;
    };
    const leadT = function (d) {
      if (d <= 0) return 0;
      if (d >= Dd) return Tend + (d - Dd) / vEnd;
      let k = 1; while (k < LD.length && LD[k] < d) k++;
      const d0 = LD[k - 1], d1 = LD[k], t0 = LT[k - 1], t1 = LT[k];
      if (k === 1) { const f = d / d1; const u = (-0.55 + Math.sqrt(0.3025 + 1.8 * f)) / 0.9; return t0 + (t1 - t0) * u; }
      return t0 + (t1 - t0) * (d - d0) / (d1 - d0);
    };
    /* コーナーのスナップショット（中身のあるものだけ・最後の地点にそろえる） */
    const cps = RC.cornerDists(race, lay);
    const snaps = (res.corners || []).filter((c) => c && c.s).map((c) => ({ k: c.k, list: RC.parseCorner(c.s) }));
    const use = snaps.slice(-cps.length), at = cps.slice(-use.length);
    /* 着差（馬身）を積み上げる */
    let accL = 0; const finL = {};
    fin.forEach((x, i) => { if (i > 0) accL += RC.marginL(x.mg) || Math.max(0.05, (RC.parseT(x.time) - RC.parseT(fin[i - 1].time)) / 0.17); finL[x.no] = accL; });
    const horses = rows.map((x) => {
      const posN = parseInt(x.pos, 10), dnf = !isFinite(posN);
      const laneStart = 0.06 + 0.86 * ((x.no || 1) - 1) / Math.max(1, n - 1);
      const pts = [{ d: 0, g: 0, l: laneStart }];
      use.forEach((sn, j) => { const e = sn.list.find((y) => y.no === x.no); if (e) pts.push({ d: at[j].d, g: e.gapL * LEN, l: e.lane }); });
      const last = pts[pts.length - 1];
      if (!dnf) {
        const pos4 = (() => { const sn = use[use.length - 1]; if (!sn) return posN; const i = sn.list.findIndex((y) => y.no === x.no); return i >= 0 ? i + 1 : posN; })();
        const lf = clamp(last.l + 0.32 * Math.max(0, pos4 - posN) / Math.max(1, n) + 0.05 * (x.no % 3), 0.06, 0.94);
        if (last.d < Dd - lay.S + 40 && use.length) pts.push({ d: Math.max(last.d + 60, Dd - lay.S + 30), g: last.g * 0.85 + finL[x.no] * LEN * 0.15, l: (last.l + lf) / 2 });
        pts.push({ d: Dd, g: (finL[x.no] || 0) * LEN, l: lf });
      } else {
        pts.push({ d: Math.min(Dd, last.d + 260), g: last.g + 45, l: Math.min(0.96, last.l + 0.3) });
        pts.push({ d: Dd + 400, g: last.g + 400, l: 0.96 });
      }
      return { no: x.no, waku: x.waku, nm: x.nm, pos: x.pos, posN: dnf ? 99 : posN, dnf: dnf, j: x.j, l3: x.l3, time: x.time, sa: x.sa, hid: x.hid, pts: pts };
    });
    const interp = function (pts, d, key) {
      if (d <= pts[0].d) return pts[0][key];
      for (let i = 1; i < pts.length; i++) {
        if (d <= pts[i].d) { const a = pts[i - 1], b = pts[i]; return a[key] + (b[key] - a[key]) * ss((d - a.d) / Math.max(1, b.d - a.d)); }
      }
      return pts[pts.length - 1][key];
    };
    const M = { race: race, lay: lay, D: Dd, n: n, horses: horses, T1: T1 || Tend, Tend: Tend, leadD: leadD, leadT: leadT, cps: at, laps: { d: ds, cum: cum }, pace: res.pace || "" };
    /* 時刻 t（秒）の各馬の位置（スタートからの距離 m）と内外 */
    M.state = function (t) {
      const x = leadD(t);
      return horses.map((h) => { const g = interp(h.pts, Math.min(x, Dd), "g"); const l = interp(h.pts, Math.min(x, Dd), "l"); let d = x - g; if (h.dnf && x > h.pts[h.pts.length - 2].d) d = Math.min(d, h.pts[h.pts.length - 2].d - (h.pts[h.pts.length - 2].g) + 30); return { h: h, d: Math.max(0, d), l: l }; });
    };
    M.endT = (function () { const worst = Math.max.apply(null, horses.filter((h) => !h.dnf).map((h) => (finL[h.no] || 0) * LEN)); return Tend + (worst + 8) / vEnd; })();
    return M;
  };

  /* ══════════ 実況（データから） ══════════ */
  RC.calls = function (M) {
    const out = [], race = M.race;
    const name = (no) => { const h = M.horses.find((x) => x.no === no); return h ? h.nm : no + "番"; };
    out.push({ t: 0.4, s: "スタートしました！ " + D.shortName(race.nm) + "、" + M.n + "頭が一斉にゲートを出ました" });
    M.cps.forEach((cp, j) => {
      const t = M.leadT(cp.d);
      out.push({ t: t, fn: (st) => {
        const o = st.slice().sort((a, b) => b.d - a.d);
        const k = j === M.cps.length - 1 ? "4コーナー" : j === M.cps.length - 2 ? "3コーナー" : "コーナー";
        return k + "、先頭は " + o[0].h.nm + "。" + (o[1] ? "2番手に " + o[1].h.nm : "") + (o[2] ? "、3番手 " + o[2].h.nm : "") + (j === M.cps.length - 1 ? "。さあ最後の直線！" : "");
      } });
    });
    if (M.D >= 1400) {
      const i = M.laps.d.indexOf(1000);
      if (i >= 0) out.push({ t: M.laps.cum[i], s: "1000m の通過は " + M.laps.cum[i].toFixed(1) + " 秒" + (M.pace ? "（" + (D.PACE_NM[M.pace] || "") + "）" : "") });
    }
    [400, 200].forEach((r) => { if (M.D > r + 100) out.push({ t: M.leadT(M.D - r), fn: (st) => { const o = st.slice().sort((a, b) => b.d - a.d); return "残り " + r + "m！ 先頭は " + o[0].h.nm + (o[1] ? "、" + o[1].h.nm + " が迫る！" : "！"); } }); });
    const fin = M.horses.filter((h) => !h.dnf).sort((a, b) => a.posN - b.posN);
    out.push({ t: M.T1, s: (fin[0] ? fin[0].nm + "、1着でゴールイン！" : "ゴール！") + (fin[1] ? " 2着 " + fin[1].nm : "") + (fin[2] ? "、3着 " + fin[2].nm : "") });
    out.push({ t: M.T1 + 2.5, s: "勝ちタイムは " + (fin[0] ? fin[0].time : "") + (fin[0] && fin[0].l3 ? "・上がり3ハロン " + fin[0].l3 : "") });
    out.sort((a, b) => a.t - b.t);
    return out;
  };

  /* ══════════ 馬を描く ══════════ */
  const COAT = { "鹿毛": ["#8a5530", "#24170f"], "黒鹿毛": ["#563321", "#1c120c"], "青鹿毛": ["#33241c", "#141010"], "青毛": ["#1d1a19", "#0c0b0b"],
    "栗毛": ["#b4642c", "#9a4f22"], "栃栗毛": ["#7c3f1e", "#5e2c14"], "芦毛": ["#bdbab3", "#7f7a73"], "白毛": ["#f1eee6", "#d6d0c4"] };
  RC.coatOf = function (title, seed) {
    const m = String(title || "").match(/(黒鹿毛|青鹿毛|栃栗毛|鹿毛|栗毛|青毛|芦毛|白毛)/);
    if (m) return COAT[m[1]];
    const ks = ["鹿毛", "黒鹿毛", "鹿毛", "栗毛", "青鹿毛", "鹿毛", "芦毛", "黒鹿毛"];
    return COAT[ks[Math.abs(seed | 0) % ks.length]];
  };
  RC.drawHorse = function (ctx, x, y, sc, ph, coat, cap, no, flip, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -sc : sc, sc);
    if (alpha != null) ctx.globalAlpha = alpha;
    const body = coat[0], dark = coat[1];
    const TAU = Math.PI * 2;
    const bob = Math.sin(ph * TAU * 2) * 1.4;
    ctx.translate(0, bob);
    /* 脚：奥の2本（暗い）→ 胴 → 手前の2本 */
    const leg = function (ax, ay, off, front, near) {
      const p = (ph + off) % 1, s = Math.sin(p * TAU), c = Math.cos(p * TAU);
      const a1 = front ? 0.15 + 0.62 * s : -0.1 + 0.55 * s;
      const a2 = front ? (s > 0 ? -0.15 - 0.9 * Math.max(0, c) : 0.2 + 0.7 * Math.max(0, -c)) : (s < 0 ? 0.9 * Math.max(0, -c) + 0.1 : -0.15);
      const kx = ax + Math.sin(a1) * 15, ky = ay + Math.cos(a1) * 15;
      const hx = kx + Math.sin(a1 + a2) * 15, hy = ky + Math.cos(a1 + a2) * 15;
      ctx.strokeStyle = near ? dark : "rgba(0,0,0,.55)";
      ctx.lineCap = "round";
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(kx, ky); ctx.stroke();
      ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.ellipse(hx + 1, hy + 1, 2.6, 1.6, 0, 0, TAU); ctx.fill();
    };
    leg(22, 6, 0.42, true, false); leg(-22, 5, 0.08, false, false);
    /* 尾 */
    ctx.strokeStyle = dark; ctx.lineWidth = 4.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-33, -5); ctx.quadraticCurveTo(-46, -2 + Math.sin(ph * TAU) * 3, -55, 7 + Math.sin(ph * TAU + 1) * 4); ctx.stroke();
    /* 胴・胸・トモ */
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, 0, 33, 12.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(22, 1, 12, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-23, -1, 13.5, 0, TAU); ctx.fill();
    /* 首と頭 */
    ctx.beginPath(); ctx.moveTo(20, -7); ctx.lineTo(35, -25); ctx.lineTo(45, -21); ctx.lineTo(33, 6); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(46, -19); ctx.rotate(0.5); ctx.beginPath(); ctx.ellipse(4, 0, 11.5, 5.4, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.moveTo(37, -27); ctx.lineTo(39, -33); ctx.lineTo(41.5, -26.5); ctx.fill();
    /* たてがみ */
    ctx.strokeStyle = dark; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(22, -9); ctx.quadraticCurveTo(29, -20, 36, -26); ctx.stroke();
    /* 光 */
    ctx.fillStyle = "rgba(255,255,255,.13)"; ctx.beginPath(); ctx.ellipse(-2, -6, 24, 4.5, 0, 0, TAU); ctx.fill();
    /* ゼッケン */
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(-14, -7, 22, 15); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#111"; ctx.font = "900 11px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.save(); if (flip) { ctx.scale(-1, 1); ctx.fillText(String(no), 3, 1); } else ctx.fillText(String(no), -3, 1); ctx.restore();
    /* 騎手（前かがみ） */
    ctx.fillStyle = "#f4f4f6";
    ctx.save(); ctx.translate(8, -15); ctx.rotate(-0.95);
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 5.6, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = "#f4f4f6"; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(13, -21); ctx.lineTo(25, -13); ctx.stroke();
    ctx.fillStyle = "#e9e3d6"; ctx.beginPath(); ctx.ellipse(-2, -9, 6, 3.4, 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = "#1a1a1a"; ctx.beginPath(); ctx.ellipse(3, -4, 2.4, 4.2, 0.2, 0, TAU); ctx.fill();
    /* 帽子（枠の色） */
    ctx.fillStyle = cap.bg; ctx.strokeStyle = cap.line || "#555"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(17, -28, 5.6, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillRect(19, -27.5, 5, 1.8);
    leg(24, 7, 0.52, true, true); leg(-20, 6, 0.0, false, true);
    ctx.restore();
  };

  /* ══════════ コース図（静止画） ══════════ */
  RC.drawCourse = function (cv, race, opt) {
    opt = opt || {};
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth || 320, H = cv.clientHeight || 200;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const lay = RC.layout(race);
    const pad = 26, tw = lay.St + 2 * lay.R, th = 2 * lay.R;
    const k = Math.min((W - pad * 2) / tw, (H - pad * 2 - 14) / th);
    const cx = W / 2, cy = H / 2 + 4;
    const P = (s) => { const p = RC.pt(lay, s); return [cx + p.x * k, cy + p.y * k]; };
    ctx.clearRect(0, 0, W, H);
    /* 芝・ダートの帯 */
    const turf = race.surf === "ダ" ? "#b98a55" : "#3aa45e";
    ctx.lineJoin = "round";
    const loop = (w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); for (let s = 0; s <= lay.L; s += 8) { const q = P(s); if (s === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); } ctx.closePath(); ctx.stroke(); };
    loop(14, "rgba(0,0,0,.08)"); loop(11, turf); loop(1.4, "rgba(255,255,255,.9)");
    /* レースで走る区間 */
    ctx.strokeStyle = "#ffd257"; ctx.lineWidth = 4.5; ctx.lineCap = "round";
    ctx.beginPath();
    for (let d = 0; d <= race.dist; d += 6) { const q = P(d - race.dist); if (d === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); }
    ctx.stroke();
    /* 向きの矢印 */
    ctx.fillStyle = "#ffd257";
    [0.18, 0.5, 0.82].forEach((f) => {
      const d = race.dist * f, a = P(d - race.dist), b = P(d - race.dist + 6);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill(); ctx.restore();
    });
    /* コーナー番号 */
    const a0 = lay.St - lay.S;
    [[a0 + lay.C / 4, "1"], [a0 + 3 * lay.C / 4, "2"], [a0 + lay.C + lay.St + lay.C / 4, "3"], [a0 + lay.C + lay.St + 3 * lay.C / 4, "4"]].forEach((c) => {
      const p = RC.pt(lay, c[0]); const r = Math.hypot(p.x, p.y) || 1;
      const q = [cx + p.x * k + p.x / r * 16, cy + p.y * k + p.y / r * 16];
      ctx.fillStyle = "rgba(20,40,30,.75)"; ctx.font = "800 10px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(c[1] + "角", q[0], q[1]);
    });
    /* スタートとゴール */
    const st = P(-race.dist), gl = P(0);
    const pin = (q, txt, col) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q[0], q[1], 8.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "900 9px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, q[0], q[1] + 0.5);
    };
    pin(st, "S", "#2b6fd6"); pin(gl, "G", "#e23b34");
    /* ゴール前の直線の長さ */
    ctx.fillStyle = "rgba(20,40,30,.8)"; ctx.font = "800 10px system-ui,sans-serif"; ctx.textAlign = "center";
    const mid = P(-lay.S / 2);
    ctx.fillText("直線 " + Math.round(lay.S) + "m", mid[0], mid[1] + 20);
    ctx.fillText((lay.left ? "左回り" : "右回り") + (lay.outer ? "・外回り" : ""), cx, cy);
  };

  /* ══════════ 再現プレーヤー ══════════
     el に TV 風の画面・コースの小窓・隊列・実況をつくる。返す：{ destroy } */
  RC.player = function (el, race, opt) {
    opt = opt || {};
    const M = RC.model(race);
    if (!M) { el.innerHTML = '<div class="rp-none">このレースは再現のデータがありません</div>'; return { destroy: function () {} }; }
    const horsesInfo = (race.horses || {});
    const coats = {}; M.horses.forEach((h) => { const hi = horsesInfo[h.hid]; coats[h.no] = RC.coatOf(hi && hi.prof && hi.prof.title, h.no * 7 + (h.nm || "").length); });
    el.innerHTML =
      '<div class="rp">' +
        '<div class="rp-tv"><canvas class="rp-cv"></canvas>' +
          '<div class="rp-hud"><b>' + esc(D.shortName(race.nm)) + '</b><span>' + esc(race.place + " " + (race.surf || "") + race.dist + "m") + '</span><i>再現（目安）</i></div>' +
          '<div class="rp-clock"><b class="rp-t">0.0</b><small class="rp-left"></small></div>' +
          '<button class="rp-big" type="button" aria-label="再生">▶</button>' +
        '</div>' +
        '<div class="rp-call"></div>' +
        '<div class="rp-order"></div>' +
        '<div class="rp-low"><canvas class="rp-map"></canvas>' +
          '<div class="rp-ctl">' +
            '<button type="button" data-rp="play" class="rp-pl">▶ 再生</button>' +
            '<button type="button" data-rp="sp" class="rp-sp">×1</button>' +
            '<button type="button" data-rp="re">↺ 最初から</button>' +
            '<button type="button" data-rp="end">⏭ ゴール</button>' +
            '<input type="range" class="rp-seek" min="0" max="1000" value="0" aria-label="再生位置">' +
          '</div></div>' +
      '</div>';
    const cv = el.querySelector(".rp-cv"), map = el.querySelector(".rp-map");
    const ctx = cv.getContext("2d"), mctx = map.getContext("2d");
    const call = el.querySelector(".rp-call"), order = el.querySelector(".rp-order"), seek = el.querySelector(".rp-seek");
    const tEl = el.querySelector(".rp-t"), leftEl = el.querySelector(".rp-left"), big = el.querySelector(".rp-big"), plBtn = el.querySelector(".rp-pl"), spBtn = el.querySelector(".rp-sp");
    const calls = RC.calls(M);
    let t = 0, playing = false, speed = 1, raf = 0, last = 0, camX = 0, callIdx = -1, lastOrder = 0, alive = true, seekDrag = false;
    const flip = !M.lay.left;          /* 右回りは右→左に走る */
    let W = 0, H = 0, dpr = 1, MW = 0, MH = 0;
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth || 360; H = cv.clientHeight || 220;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      MW = map.clientWidth || 160; MH = map.clientHeight || 100;
      map.width = Math.round(MW * dpr); map.height = Math.round(MH * dpr);
    }
    resize();
    const onResize = () => { resize(); draw(); };
    window.addEventListener("resize", onResize);
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

    function draw() {
      const st = M.state(t);
      const lead = Math.max.apply(null, st.map((x) => x.d));
      const target = lead - 9;
      if (!camX || Math.abs(target - camX) > 120) camX = target; else camX += (target - camX) * 0.12;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ppm = clamp(W / 34, 8, 18);
      const dir = flip ? -1 : 1;
      const sx = (d) => W / 2 + (d - camX) * ppm * dir;
      const horizon = H * 0.3, top = H * 0.4, bot = H * 0.93;
      /* 空 */
      const g = ctx.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, "#7cc4f5"); g.addColorStop(1, "#d8f0ff");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon);
      /* 遠くの山と木（ゆっくり動く） */
      ctx.fillStyle = "#8fbf9c";
      for (let i = -2; i < 8; i++) {
        const bx = ((i * 140 - camX * 0.25 * dir) % (W + 280) + W + 280) % (W + 280) - 140;
        ctx.beginPath(); ctx.moveTo(bx, horizon); ctx.quadraticCurveTo(bx + 70, horizon - 34 - (i % 3) * 8, bx + 140, horizon); ctx.fill();
      }
      ctx.fillStyle = "#4f9a63";
      for (let i = -2; i < 18; i++) {
        const bx = ((i * 60 - camX * 0.45 * dir) % (W + 120) + W + 120) % (W + 120) - 60;
        ctx.beginPath(); ctx.arc(bx, horizon + 2, 14 + (i % 4) * 3, Math.PI, 0); ctx.fill();
      }
      /* スタンド（ゴールの近く） */
      const gx = sx(M.D);
      if (gx > -900 && gx < W + 900) {
        const sw = 520 * ppm / 12;
        ctx.fillStyle = "#c9ced8"; ctx.fillRect(gx - sw * 0.75, horizon - 46, sw, 46);
        ctx.fillStyle = "#9aa3b2"; ctx.fillRect(gx - sw * 0.75, horizon - 50, sw, 6);
        ctx.fillStyle = "#e4e7ee";
        for (let r = 0; r < 4; r++) for (let c = 0; c < sw / 9; c++) { if ((r + c) % 3) ctx.fillRect(gx - sw * 0.75 + c * 9 + 2, horizon - 42 + r * 10, 5, 6); }
      }
      /* 馬場 */
      const turf = race.surf === "ダ";
      ctx.fillStyle = turf ? "#b98a55" : "#3d9f5a"; ctx.fillRect(0, horizon, W, H - horizon);
      /* 芝の刈り目（縦じま） */
      ctx.fillStyle = turf ? "rgba(90,50,20,.08)" : "rgba(255,255,255,.07)";
      const stripe = 10 * ppm;
      const off = ((-camX * ppm * dir) % (stripe * 2) + stripe * 2) % (stripe * 2);
      for (let x = -stripe * 2 + off; x < W; x += stripe * 2) ctx.fillRect(x, top - 8, stripe, bot - top + 18);
      /* 内ラチ（奥）と外ラチ（手前） */
      const rail = (y, h2) => {
        ctx.fillStyle = "#fff"; ctx.fillRect(0, y, W, h2);
        ctx.fillStyle = "rgba(255,255,255,.85)";
        const post = 4 * ppm, o2 = ((-camX * ppm * dir) % post + post) % post;
        for (let x = o2; x < W; x += post) ctx.fillRect(x - 1, y, 2, h2 + 7);
      };
      rail(top - 14, 3);
      /* ハロン棒（残りの距離） */
      for (let r = 0; r <= M.D; r += 200) {
        const x = sx(M.D - r); if (x < -20 || x > W + 20) continue;
        ctx.fillStyle = r === 0 ? "#e23b34" : "#fff"; ctx.fillRect(x - 2, top - 44, 4, 32);
        ctx.fillStyle = r === 0 ? "#e23b34" : "#1d2a35"; ctx.font = "900 11px system-ui,sans-serif"; ctx.textAlign = "center";
        ctx.fillText(r === 0 ? "GOAL" : String(r / 100), x, top - 48);
        if (r === 0) { ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.fillRect(x - 1, top - 12, 2, bot - top + 14); }
      }
      /* 馬（奥＝内 から 手前＝外 の順に） */
      const list = st.slice().sort((a, b) => a.l - b.l);
      list.forEach((x) => {
        const px = sx(x.d); if (px < -80 || px > W + 80) return;
        const y = top + (bot - top) * x.l;
        const sc = (0.46 + 0.24 * x.l) * ppm / 12;
        const wk = D.WAKU[(x.h.waku || 1) - 1] || D.WAKU[0];
        RC.drawHorse(ctx, px, y - 18 * sc, sc, (x.d / 6.8) % 1, coats[x.h.no], wk, x.h.no, flip, x.h.dnf && x.d < lead - 60 ? 0.5 : 1);
      });
      rail(bot + 10, 4);
      /* 小窓（コース） */
      drawMap(st);
      /* 時計・残り */
      const raceT = Math.min(t, M.endT);
      tEl.textContent = raceT < 60 ? raceT.toFixed(1) : Math.floor(raceT / 60) + ":" + (raceT % 60).toFixed(1).padStart(4, "0");
      const rem = Math.max(0, M.D - lead);
      leftEl.textContent = rem > 0 ? "残り " + Math.ceil(rem / 10) * 10 + "m" : "ゴール";
      if (!seekDrag) seek.value = String(Math.round(1000 * t / M.endT));
      /* 隊列（4回/秒） */
      if (performance.now() - lastOrder > 250 || !playing) {
        lastOrder = performance.now();
        const o = st.slice().sort((a, b) => b.d - a.d);
        order.innerHTML = o.map((x, i) => { const wk = D.WAKU[(x.h.waku || 1) - 1] || D.WAKU[0]; return '<span class="rp-o' + (x.h.dnf ? " dnf" : "") + '"><i>' + (i + 1) + '</i><b style="background:' + wk.bg + ";color:" + wk.ink + ";border-color:" + wk.line + '">' + x.h.no + "</b></span>"; }).join("");
      }
      /* 実況 */
      let ci = -1; for (let i = 0; i < calls.length; i++) if (calls[i].t <= t) ci = i;
      if (ci !== callIdx) { callIdx = ci; if (ci >= 0) { const c = calls[ci]; call.textContent = c.fn ? c.fn(st) : c.s; call.classList.remove("on"); void call.offsetWidth; call.classList.add("on"); } else call.textContent = ""; }
    }
    function drawMap(st) {
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.clearRect(0, 0, MW, MH);
      const lay = M.lay, pad = 10;
      const k = Math.min((MW - pad * 2) / (lay.St + 2 * lay.R), (MH - pad * 2) / (2 * lay.R));
      const cx = MW / 2, cy = MH / 2;
      const P = (s) => { const p = RC.pt(lay, s); return [cx + p.x * k, cy + p.y * k]; };
      mctx.strokeStyle = race.surf === "ダ" ? "#b98a55" : "#3aa45e"; mctx.lineWidth = 7; mctx.lineJoin = "round";
      mctx.beginPath(); for (let s = 0; s <= lay.L; s += 10) { const q = P(s); if (!s) mctx.moveTo(q[0], q[1]); else mctx.lineTo(q[0], q[1]); } mctx.closePath(); mctx.stroke();
      const g = P(0); mctx.fillStyle = "#e23b34"; mctx.fillRect(g[0] - 1.5, g[1] - 6, 3, 12);
      st.slice().sort((a, b) => a.d - b.d).forEach((x) => {
        const q = P(x.d - M.D), wk = D.WAKU[(x.h.waku || 1) - 1] || D.WAKU[0];
        mctx.fillStyle = wk.bg; mctx.strokeStyle = wk.line === "#b9bdc6" ? "#555" : "rgba(0,0,0,.45)"; mctx.lineWidth = 1;
        mctx.beginPath(); mctx.arc(q[0], q[1], 3.6, 0, Math.PI * 2); mctx.fill(); mctx.stroke();
      });
    }
    function frame(now) {
      if (!alive) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
      if (playing) { t += dt * speed; if (t >= M.endT) { t = M.endT; playing = false; setPlay(); } }
      draw();
      raf = requestAnimationFrame(frame);
    }
    function setPlay() { plBtn.textContent = playing ? "⏸ 一時停止" : "▶ 再生"; big.hidden = playing || t > 0; }
    el.addEventListener("click", (e) => {
      if (e.target.closest(".rp-big")) { if (t >= M.endT) t = 0; playing = true; setPlay(); return; }
      const b = e.target.closest("[data-rp]"); if (!b) return;
      const a = b.getAttribute("data-rp");
      if (a === "play") { if (t >= M.endT) t = 0; playing = !playing; }
      else if (a === "sp") { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; spBtn.textContent = "×" + speed; }
      else if (a === "re") { t = 0; camX = 0; callIdx = -1; playing = true; }
      else if (a === "end") { t = Math.max(0, M.T1 - 0.2); playing = true; }
      setPlay();
    });
    seek.addEventListener("input", () => { seekDrag = true; t = M.endT * Number(seek.value) / 1000; camX = 0; callIdx = -1; setPlay(); draw(); });
    seek.addEventListener("change", () => { seekDrag = false; });
    setPlay();
    raf = requestAnimationFrame(frame);
    if (opt.autoplay) { playing = true; setPlay(); }
    return { destroy: function () { alive = false; cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); el.innerHTML = ""; }, model: M };
  };
})();
