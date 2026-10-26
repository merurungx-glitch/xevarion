/* ============================================================
   MagiShift — CPU（★★ 2026-10-13 ご指定「CPUモードを追加」）
   ------------------------------------------------------------
   ・盤面を小さな配列に写して、できる手（置く・動かす・押す・ブロック）を全部ためす。
   ・考える順番
       ① その手で勝てるなら必ず指す
       ② 指したあと、相手（とくに次の人）が<b>すぐ勝てる形</b>が残る手は大きく減点（＝守る）
          ★ 2026-10-27 減点は番の近い人ほど重い（3倍ずつ）＝止められるのが1人だけなら、自分の番から近い人を止める
       ③ 自分が次に勝てる形（リーチ）を作る手、2か所以上のリーチ（ふたまた）は加点
       ④ のこりは「並べる数ぶんの窓」に自分の駒がいくつ入っているかで形のよさを点にする
   ・強さ（S.cpuLevel）
       0 よわい … ときどき適当に指す・相手のリーチは次の人のぶんだけ見る
       1 ふつう … ①〜④（次の人を重く、ほかの人は軽く見る）
       2 つよい … 全員のリーチを重く見る・ふたまたを狙う・迷いが少ない
   ★ ルールは shift-core.js の決まり（飛びこえ移動・押す・ブロック）と同じ動きを、ここで速く写しているだけ。
   ============================================================ */
(function () {
  "use strict";
  const G = window.MShift;
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const D4 = [[1, 0], [0, 1], [1, 1], [1, -1]];

  function snap(S) {
    return { n: S.size, win: S.win, move: S.move, maxP: S.maxPieces, cells: Int8Array.from(S.cells),
      tactics: S.mode === "tactics", bl: (S.blockLeft || []).slice(), np: S.players.length };
  }
  const cnt = (B, s) => { let c = 0; for (let i = 0; i < B.cells.length; i++) if (B.cells[i] === s) c++; return c; };
  const inb = (B, x, y) => x >= 0 && y >= 0 && x < B.n && y < B.n;

  /* (x,y) をふくむ並びが win 以上か */
  function lineThrough(B, x, y, s) {
    const n = B.n, C = B.cells;
    for (const [dx, dy] of D4) {
      let c = 1;
      for (let k = 1; k < B.win; k++) { const nx = x + dx * k, ny = y + dy * k; if (!inb(B, nx, ny) || C[ny * n + nx] !== s) break; c++; }
      for (let k = 1; k < B.win; k++) { const nx = x - dx * k, ny = y - dy * k; if (!inb(B, nx, ny) || C[ny * n + nx] !== s) break; c++; }
      if (c >= B.win) return true;
    }
    return false;
  }

  /* その人ができる手の一覧。blockCells＝ブロックを考える候補のマス（全部のマスを候補にすると多すぎる） */
  function actions(B, s, blockCells) {
    const out = [], n = B.n, C = B.cells;
    if (!B.maxP || cnt(B, s) < B.maxP) for (let i = 0; i < C.length; i++) if (C[i] === -1) out.push({ t: "place", x: i % n, y: (i / n) | 0 });
    for (let i = 0; i < C.length; i++) {
      if (C[i] !== s) continue;
      const x = i % n, y = (i / n) | 0;
      for (const [dx, dy] of D8) {
        for (let k = 1; k <= B.move; k++) {
          const nx = x + dx * k, ny = y + dy * k;
          if (!inb(B, nx, ny)) break;
          if (C[ny * n + nx] === -1) out.push({ t: "move", fx: x, fy: y, x: nx, y: ny });
        }
        if (B.tactics) {
          const tx = x + dx, ty = y + dy;
          if (!inb(B, tx, ty)) continue;
          const v = C[ty * n + tx];
          if (v < 0 || v === s) continue;
          const ex = tx + dx, ey = ty + dy;
          if (!inb(B, ex, ey) || C[ey * n + ex] !== -1) continue;
          out.push({ t: "push", fx: x, fy: y, tx, ty, x: ex, y: ey });
        }
      }
    }
    if (B.tactics && (B.bl[s] || 0) > 0 && blockCells) blockCells.forEach((i) => { if (C[i] === -1) out.push({ t: "block", x: i % n, y: (i / n) | 0 }); });
    return out;
  }

  /* 手を指したあとの盤面と、そこで勝った人（いなければ -1） */
  function apply(B, s, a) {
    const B2 = Object.assign({}, B, { cells: B.cells.slice(), bl: B.bl.slice() }), C = B2.cells, n = B.n;
    let win = -1;
    if (a.t === "place") { C[a.y * n + a.x] = s; if (lineThrough(B2, a.x, a.y, s)) win = s; }
    else if (a.t === "move") { C[a.fy * n + a.fx] = -1; C[a.y * n + a.x] = s; if (lineThrough(B2, a.x, a.y, s)) win = s; }
    else if (a.t === "push") { const v = C[a.ty * n + a.tx]; C[a.ty * n + a.tx] = -1; C[a.y * n + a.x] = v; if (lineThrough(B2, a.x, a.y, v)) win = v; }
    else if (a.t === "block") { C[a.y * n + a.x] = G.BLOCK; B2.bl[s] = (B2.bl[s] || 0) - 1; }
    return { B: B2, win };
  }

  /* その人が「次の1手」で勝てるマス（置く・動かす）。押して勝つことはない（押されるのは相手の駒） */
  function winCells(B, s) {
    const res = [], n = B.n, C = B.cells;
    if (!B.maxP || cnt(B, s) < B.maxP) {
      for (let i = 0; i < C.length; i++) {
        if (C[i] !== -1) continue;
        C[i] = s; if (lineThrough(B, i % n, (i / n) | 0, s)) res.push(i); C[i] = -1;
      }
    }
    for (let i = 0; i < C.length; i++) {
      if (C[i] !== s) continue;
      const x = i % n, y = (i / n) | 0;
      C[i] = -1;
      for (const [dx, dy] of D8) for (let k = 1; k <= B.move; k++) {
        const nx = x + dx * k, ny = y + dy * k;
        if (!inb(B, nx, ny)) break;
        const j = ny * n + nx;
        if (C[j] !== -1) continue;
        C[j] = s; if (lineThrough(B, nx, ny, s) && res.indexOf(j) < 0) res.push(j); C[j] = -1;
      }
      C[i] = s;
    }
    return res;
  }

  /* 形のよさ：win マスの窓に、1人の駒と空きだけが入っているとき、その人の駒の数で点を足す */
  const WT = [0, 1, 6, 30, 140, 600, 2400];
  function shape(B) {
    const n = B.n, C = B.cells, sc = new Float64Array(B.np);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      for (const [dx, dy] of D4) {
        const ex = x + dx * (B.win - 1), ey = y + dy * (B.win - 1);
        if (!inb(B, ex, ey)) continue;
        let owner = -1, k = 0, dead = false;
        for (let j = 0; j < B.win; j++) {
          const v = C[(y + dy * j) * n + (x + dx * j)];
          if (v === -1) continue;
          if (v < 0 || (owner >= 0 && v !== owner)) { dead = true; break; }
          owner = v; k++;
        }
        if (!dead && owner >= 0) sc[owner] += WT[Math.min(k, WT.length - 1)] * (k >= B.win - 1 ? 1.6 : 1);
      }
    }
    return sc;
  }

  /* ══ CPU の1手を決める ══
     ★★ 2026-10-20 o.level（強さの上書き）・o.det（ゆらぎなし＝ヒント用）・o.info（理由を返す） */
  function choose(S, o) {
    o = o || {};
    const level = o.level != null ? o.level : S.cpuLevel == null ? 1 : S.cpuLevel;
    const B = snap(S), me = S.turn;
    const ord = G.orderOf(S), k0 = ord.indexOf(me);
    const opps = [];
    for (let j = 1; j < ord.length; j++) opps.push(ord[(k0 + j) % ord.length]);

    /* 相手がいま勝てるマス（ブロックの候補にもする） */
    const threat = new Set();
    opps.forEach((o, j) => { if (level > 0 || j === 0) winCells(B, o).forEach((i) => threat.add(i)); });
    const acts = actions(B, me, Array.from(threat));
    if (!acts.length) return null;

    /* ① 勝てる手 */
    for (const a of acts) { const r = apply(B, me, a); if (r.win === me) return o.info ? { a, why: "win" } : a; }

    /* よわい：ときどき適当に（ただし相手に勝ちをわたす押しかたはしない） */
    if (level === 0 && !o.det && Math.random() < 0.42) {
      const safe = acts.filter((a) => a.t !== "push");
      return safe[(Math.random() * safe.length) | 0] || acts[0];
    }

    let best = null, bestSc = -Infinity, bestInfo = null;
    /* いま相手がすぐ勝てるマス（ヒントの理由に使う）。nowThreat[マス]・nowBy とも番の近い順 */
    const nowThreat = {}, nowBy = [];
    opps.forEach((op) => { const ws = winCells(B, op); if (ws.length) nowBy.push(op); ws.forEach((i) => { (nowThreat[i] = nowThreat[i] || []).push(op); }); });
    /* ★★ 2026-10-27 ご指定「守りの手は、自分の番から近い相手に対して」：
       相手のリーチの重さを、番の近い順に3倍ずつ重くする（いちばん遠い人が前と同じ 12000／40000）。
       近い人1人の重さ ＞ それより遠い人ぜんぶ（ふたまたの1.6倍こみ）なので、1手で1人しか止められないときは必ず近い人を止める。
       次の人（j=0）は前と同じく最低 100000。 */
    const far = level === 2 ? 40000 : 12000, m = opps.length;
    const TW = opps.map((_, j) => Math.max(j === 0 ? 100000 : 0, far * Math.pow(3, m - 1 - j)));
    for (const a of acts) {
      const r = apply(B, me, a);
      if (r.win >= 0 && r.win !== me) continue;              /* 押して相手の並びを作ってしまう手は指さない */
      let pen = 0;
      const left = [];
      opps.forEach((o, j) => {
        if (level === 0 && j > 0) return;
        const w = winCells(r.B, o).length;
        if (!w) return;
        left.push(o);
        pen += TW[j] * (w > 1 ? 1.6 : 1);
      });
      const sh = shape(r.B);
      let mine = sh[me], other = 0, sum = 0;
      for (let p = 0; p < sh.length; p++) if (p !== me) { other = Math.max(other, sh[p]); sum += sh[p]; }
      let sc = mine - other * (level === 2 ? 1.25 : 1.05) - sum * 0.2 - pen;
      const myW = winCells(r.B, me).length;                  /* 次に自分が勝てるマス（リーチ） */
      if (myW >= 2) sc += level === 2 ? 50000 : 9000;
      else if (myW === 1) sc += level === 2 ? 7000 : 2500;
      if (a.t === "block") sc -= 150;                        /* ブロックは数が限られるので、ほかの手で守れるならそちら */
      if (a.t === "place" && B.maxP && cnt(B, me) >= B.maxP - 1) sc -= 40;   /* 最後の1個はなるべく残す */
      const noise = o.det ? 0 : level === 2 ? 4 : level === 1 ? 25 : 120;
      sc += Math.random() * noise;
      if (sc > bestSc) { bestSc = sc; best = a; bestInfo = { pen, myW, left }; }
    }
    if (!o.info) return best || acts[0];
    /* ★★ 2026-10-20 ヒントの理由（★ 2026-10-27 止めた相手＝その手で勝てるマスが消えた人のうち、番がいちばん近い人） */
    const a = best || acts[0], tgt = a.y * B.n + a.x;
    let why = "shape", who = null;
    const stopped = bestInfo ? nowBy.filter((op) => bestInfo.left.indexOf(op) < 0) : [];
    const blocked = nowBy.length && bestInfo && !bestInfo.pen;
    if (nowThreat[tgt] && (a.t === "place" || a.t === "move" || a.t === "block")) { why = "stop"; who = nowThreat[tgt][0]; }
    else if (a.t === "push" && stopped.length) { why = "stop"; who = stopped[0]; }
    else if (bestInfo && bestInfo.myW >= 2) why = "fork";
    else if (bestInfo && bestInfo.myW === 1) why = "reach";
    else if (blocked) { why = "stop"; who = stopped.length ? stopped[0] : nowBy[0]; }
    return { a, why, who };
  }
  /* ★★ 2026-10-20 ご指定「ヒント」：いまの番の人にとっていちばんよい手（つよいの考え方・ゆらぎなし）と、その理由
     why … win（勝てる）／stop（相手のリーチを止める）／fork（ふたまた）／reach（リーチを作る）／shape（形をよくする） */
  function hint(S) { try { return choose(S, { level: 2, det: true, info: true }); } catch (e) { return null; } }
  /* ★★ 2026-10-20 ご指定「戦況をバーで」：人ごとの「勢い」（形のよさ＋すぐ勝てるマス）を割合にして返す（合計 1）。
     ★ そろえかけの窓の点（shape）は駒が増えると急にふくらむので、0.6乗でならし、だれもが少しは見えるように床を足す */
  function advantage(S) {
    const B = snap(S), sh = shape(B), np = B.np, out = new Array(np).fill(0);
    let sum = 0;
    for (let p = 0; p < np; p++) {
      const w = winCells(B, p).length;
      const v = Math.pow(Math.max(0, sh[p]) + w * 900 + 6, 0.6);
      out[p] = v; sum += v;
    }
    return out.map((v) => (sum ? v / sum : 1 / np));
  }

  /* CPU の手を、画面と同じ形で実行する（shift-core の place/move/push/block） */
  function play(S, a) {
    if (!a) return null;
    if (a.t === "place") return G.place(S, a.x, a.y);
    if (a.t === "move") return G.move(S, a.fx, a.fy, a.x, a.y);
    if (a.t === "push") return G.push(S, a.fx, a.fy, a.tx, a.ty);
    if (a.t === "block") return G.block(S, a.x, a.y);
    return null;
  }

  G.AI = { choose, play, hint, advantage, winCells: (S, s) => winCells(snap(S), s) };
})();
