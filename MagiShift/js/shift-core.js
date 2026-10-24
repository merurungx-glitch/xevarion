/* ============================================================
   MagiShift — ルールの本体（2026-09-21 新作）
   ------------------------------------------------------------
   マルバツゲームを発展させた 2〜8人のボードゲーム（★★ 2026-10-20 8人まで）。
   ★ このゲームの要：<b>置いた駒をあとから動かせる</b>。
     そのため盤面はいつも変わり、最後まで逆転がある。

   ・自分の手番でできることは「置く」か「自分の駒を動かす」のどちらか1つ。
   ・並べる数（勝利条件）を、たて・よこ・ななめ のどれかでそろえたら勝ち。
   ・人数で盤面の広さと勝利条件が変わる（RULES。あとから数字だけ変えられる）。

   ★★ 2026-10-13 ご指定で3つ変えた
     ① 動かすときは<b>あいだに駒があっても飛びこえて</b>2マス先に置ける（行き先が空いていればよい）
     ② <b>タクティクス</b>（もうひとつのルール）。守りに行くとき「そこに置くしかない」に
        ならないよう、手番の選択肢を2つ足した。
          ・押す   … 自分の駒のとなり（たて・よこ・ななめ）にある<b>ほかの人の駒を1マス押し出す</b>
                     （押した先が空いているときだけ。自分の駒は動かない）
          ・ブロック … 空いているマスに<b>だれのものでもない壁</b>を置く（1人2個まで）。
                     壁は<b>置いた人の次の番が来ると消える</b>（＝ほかの全員の番を1周ふさぐ）
     ③ 決着がつかないまま <b>50周</b>したら引き分け（CPU どうしでも必ず終わるように）
        ★★ 2026-10-14 ご指定「50周の決着は CPU のみのときのみに反映」：<b>全員が CPU の対戦だけ</b>。人が1人でもいれば周回の上限なし
   ★ 画面（shift-ui.js）と CPU（shift-ai.js）はこのファイルの関数だけを呼ぶ。盤面の状態はここだけが持つ。
   ============================================================ */
(function () {
  "use strict";
  const MS = (window.MShift = window.MShift || {});

  /* ══ 人数ごとの決まり（ここだけ直せばバランスを変えられる） ══ */
  /* ★★ 2026-09-21 ご指定の数字に変更。
       人数 ／ 盤面 ／ 1人が置ける駒の上限 ／ 勝利条件
       2人 5×5 6個 4つ並べ ・ 3人 6×6 6個 4つ並べ ・ 4人 7×7 6個 4つ並べ
       5人 8×8 7個 5つ並べ ・ 6人 9×9 7個 5つ並べ
     ★ 駒を使いきったあとは<b>置けず、動かすだけ</b>になる。ここがこのゲームの読み合いの中心。 */
  /* ★★ 2026-10-14 ご指定「勝利条件で 5・6人で4個並べを標準に」：5人・6人も<b>4つ並べ</b>（盤と駒の数はそのまま） */
  /* ★★ 2026-10-20 ご指定「8人対応まで」：7人・8人は 10×10・4つ並べ・1人7個（駒のこみぐあいは 6人とほぼ同じ） */
  const RULES = {
    2: { size: 5, win: 4, pieces: 6, move: 2 },
    3: { size: 6, win: 4, pieces: 6, move: 2 },
    4: { size: 7, win: 4, pieces: 6, move: 2 },
    5: { size: 8, win: 4, pieces: 7, move: 2 },
    6: { size: 9, win: 4, pieces: 7, move: 2 },
    7: { size: 10, win: 4, pieces: 7, move: 2 },
    8: { size: 10, win: 4, pieces: 7, move: 2 },
  };
  const MAX_PLAYERS = 8;
  /* pieces:0 ＝ 置ける数に上限なし。move ＝ 1手で動ける距離（たて・よこ・ななめ） */

  /* ★★ 2026-10-13 ルールの種類（ご指定「守りに行かなければならないときに手段が固定される」への別ルール） */
  const MODES = {
    normal: { nm: "ノーマル", sub: "置く・動かす" },
    tactics: { nm: "タクティクス", sub: "置く・動かす＋押す・ブロック" },
  };
  const BLOCKS = 2;           /* タクティクスで1人が使えるブロックの数 */
  const BLOCK = -2;           /* マスの値：ブロック（だれのものでもない壁）。-1 は空き */
  const MAX_ROUNDS = 50;      /* この周回数で決着がつかなければ引き分け（★ 全員が CPU の対戦だけ・allCpu） */
  /* ★★ 2026-10-14 全員が CPU か（人が1人でもいれば、50周の引き分けは使わない） */
  const allCpu = (S) => !!(S && S.players && S.players.length && S.players.every((p) => p.type === "cpu"));

  /* ══ プレイヤーの色と印（色だけに頼らないよう、印と番号も付ける） ══ */
  /* ★★ 2026-10-16 ご指定「赤・黄・オレンジが見分けにくい → 色を区別しやすく、中の形もバツや星などに」：
     ・色は明るさでも分ける（赤＝深い赤・オレンジ＝あざやかな橙・黄＝明るいレモン）
     ・形は 赤＝✕（バツ）／黄＝★（星）／オレンジ＝♥（ハート）。前の ✕ と ★ はブルー・パープルと<b>交換</b>（ブルー＝●・パープル＝■）
     ・印の色はどの色も白（★★ 2026-10-16b ご指定で黄色も白に。濃い色の印にしたい色は ink を書く）
     ★ 古いセーブの駒も upgrade() でこの表に合わせなおす（色と形は id＝席の色の番号で決まる） */
  const COLORS = [
    { id: 0, name: "レッド",   color: "#d81e3c", mark: "cross" },
    { id: 1, name: "ブルー",   color: "#2f7cf6", mark: "circle" },
    { id: 2, name: "グリーン", color: "#16a865", mark: "triangle" },
    { id: 3, name: "イエロー", color: "#ffd21f", mark: "star" },   /* ★★ 2026-10-16b 星はほかと同じ白（ご指定） */
    { id: 4, name: "パープル", color: "#8b5cf6", mark: "square" },
    { id: 5, name: "オレンジ", color: "#ff8a12", mark: "heart" },
    /* ★★ 2026-10-20 7人目・8人目（ご指定「マークや色が見やすいように」）：
       ほかの6色とは色相も明るさもはなれた<b>シアン（水色）＝◆</b>と<b>ブラック＝☾（三日月）</b>。形もほかと重ならないものに */
    { id: 6, name: "シアン",   color: "#06aecb", mark: "diamond" },
    { id: 7, name: "ブラック", color: "#2f3447", mark: "moon" },
  ];
  /* 前の色（古いセーブの駒・保存一覧の見出し）→ 新しい表の番号 */
  const OLD_COLOR = { "#ef4b5a": 0, "#2f7cf6": 1, "#16a865": 2, "#f0b400": 3, "#8b5cf6": 4, "#f97316": 5 };
  /* 駒の見た目（色・形・印の色）。id があればそれ、なければ前の色から引く */
  function looks(p) {
    if (!p) return COLORS[0];
    let c = (p.id != null && COLORS[p.id]) ? COLORS[p.id] : null;
    if (!c && p.color && OLD_COLOR[String(p.color).toLowerCase()] != null) c = COLORS[OLD_COLOR[String(p.color).toLowerCase()]];
    return c ? { color: c.color, mark: c.mark, ink: c.ink || "" } : { color: p.color, mark: p.mark, ink: p.ink || "" };
  }
  const DIR8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  const idx = (S, x, y) => y * S.size + x;
  const inBoard = (S, x, y) => x >= 0 && y >= 0 && x < S.size && y < S.size;
  const at = (S, x, y) => (inBoard(S, x, y) ? S.cells[idx(S, x, y)] : -9);
  const isTactics = (S) => S.mode === "tactics";

  /* ══ 新しい試合をつくる ══
     players … [{ uid, name, charFile, type:"human"|"cpu" }]（XEVARION の紐づけは shift-account.js が用意する） */
  /* ★★ 2026-09-22 ご指定「順番を抽選でランダムに」。
     席（色・印・盤面の番号＝slot）はそのまま、<b>手番の順だけ</b>を order に持つ。
     order[0] の人から始めて、order の並びで回る。 */
  function shuffleOrder(n) {
    const o = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = o[i]; o[i] = o[j]; o[j] = t; }
    return o;
  }
  function newGame(players, opt) {
    opt = opt || {};
    const n = players.length;
    const base = RULES[n] || RULES[4];
    const size = opt.size || base.size;
    const win = opt.win || base.win;
    const mode = MODES[opt.mode] ? opt.mode : "normal";
    return {
      v: 2, gid: newGid(), mode, size, win, move: opt.move || base.move,
      maxPieces: opt.pieces === 99 ? 0 : (opt.pieces || base.pieces),
      cpuLevel: opt.cpuLevel == null ? 1 : opt.cpuLevel,
      players: players.map((p, i) => Object.assign({ slot: i, wins: 0, type: "human" }, COLORS[i], p)),
      cells: new Array(size * size).fill(-1),      /* -1 ＝ 空き・-2 ＝ ブロック。それ以外は置いた人の番号 */
      blockLeft: players.map(() => (mode === "tactics" ? BLOCKS : 0)),
      blks: [],                                     /* ブロック [{ x, y, by }]（by＝置いた人。その人の次の番で消える） */
      turn: 0, phase: "play", winner: null, line: null, draw: false, moves: 0, round: 1,
      startedAt: Date.now(), log: [],
      order: (opt.order && opt.order.length === n) ? opt.order.slice() : Array.from({ length: n }, (_, i) => i), opos: 0,
      sel: null,                                    /* 動かすために選んでいる駒 { x, y } */
      last: null,                                   /* 直前の手（盤に印を出す） */
    };
  }
  /* 前の版のセーブ（v なし）を、いまの形にそろえる */
  function upgrade(S) {
    if (!S) return S;
    if (!S.mode) S.mode = "normal";
    if (!Array.isArray(S.blockLeft)) S.blockLeft = S.players.map(() => 0);
    if (!Array.isArray(S.blks)) S.blks = [];
    if (!S.round) S.round = 1;
    if (S.cpuLevel == null) S.cpuLevel = 1;
    S.players.forEach((p) => { if (!p.type) p.type = "human"; });
    /* ★★ 2026-10-16 色と形の表を変えたので、古いセーブの駒も新しい見た目に */
    S.players.forEach((p) => { const L = looks(p); p.color = L.color; p.mark = L.mark; if (L.ink) p.ink = L.ink; else delete p.ink; });
    S.v = 2;
    return S;
  }

  const cur = (S) => S.players[S.turn];
  const countOf = (S, slot) => S.cells.reduce((a, v) => a + (v === slot ? 1 : 0), 0);
  /* あと何個おけるか（上限なしのときは null） */
  const leftOf = (S, slot) => (S.maxPieces ? Math.max(0, S.maxPieces - countOf(S, slot)) : null);
  /* その人はもう置けない＝動かすだけの番になっている */
  const outOfPieces = (S, slot) => !!S.maxPieces && countOf(S, slot) >= S.maxPieces;

  /* 置けるか（空いていること・上限を超えないこと） */
  function canPlace(S, x, y) {
    if (S.phase !== "play" || !inBoard(S, x, y)) return false;
    if (at(S, x, y) !== -1) return false;
    if (S.maxPieces && countOf(S, S.turn) >= S.maxPieces) return false;
    return true;
  }
  /* 動かせる駒か（自分の駒だけ） */
  const canPick = (S, x, y) => S.phase === "play" && at(S, x, y) === S.turn;
  /* その駒が動ける先（たて・よこ・ななめに move マスまで）
     ★★ 2026-10-13 ご指定：<b>あいだにほかの駒があっても飛びこえて</b>置ける。行き先が空いていればよい。 */
  function movesOf(S, x, y) {
    const out = [];
    if (!canPick(S, x, y)) return out;
    DIR8.forEach(([dx, dy]) => {
      for (let k = 1; k <= S.move; k++) {
        const nx = x + dx * k, ny = y + dy * k;
        if (!inBoard(S, nx, ny)) break;
        if (at(S, nx, ny) === -1) out.push({ x: nx, y: ny, jump: k > 1 && at(S, x + dx, y + dy) !== -1 });
      }
    });
    return out;
  }
  const canMove = (S, fx, fy, tx, ty) => movesOf(S, fx, fy).some((m) => m.x === tx && m.y === ty);

  /* ══ ★★ 2026-10-13 タクティクス：押す ══
     自分の駒 (fx,fy) のとなりにある、ほかの人の駒を、同じ向きにもう1マス押し出す。押した先が空いているときだけ。 */
  function pushesOf(S, fx, fy) {
    const out = [];
    if (!isTactics(S) || !canPick(S, fx, fy)) return out;
    DIR8.forEach(([dx, dy]) => {
      const tx = fx + dx, ty = fy + dy, v = at(S, tx, ty);
      if (v < 0 || v === S.turn) return;
      const ex = tx + dx, ey = ty + dy;
      if (at(S, ex, ey) !== -1) return;
      out.push({ tx, ty, x: ex, y: ey, dx, dy, who: v });
    });
    return out;
  }
  const canPush = (S, fx, fy, tx, ty) => pushesOf(S, fx, fy).some((p) => p.tx === tx && p.ty === ty);
  /* ブロックを置けるか */
  const canBlock = (S, x, y) => isTactics(S) && S.phase === "play" && at(S, x, y) === -1 && (S.blockLeft[S.turn] || 0) > 0;

  /* ══ そろっているか（たて・よこ・ななめ） ══ */
  function lineAt(S, x, y) {
    const slot = at(S, x, y);
    if (slot < 0) return null;
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dx, dy] of dirs) {
      const cells = [{ x, y }];
      for (const s of [1, -1]) {
        for (let k = 1; k < S.size; k++) {
          const nx = x + dx * k * s, ny = y + dy * k * s;
          if (at(S, nx, ny) !== slot) break;
          cells.push({ x: nx, y: ny });
        }
      }
      if (cells.length >= S.win) return cells.sort((a, b) => a.y - b.y || a.x - b.x).slice(0, S.win + 4);
    }
    return null;
  }
  function checkWin(S, x, y) {
    const line = lineAt(S, x, y);
    if (!line) return null;
    S.phase = "end"; S.winner = at(S, x, y); S.line = line;
    S.players[S.winner].wins++;
    S.endedAt = Date.now();
    return { winner: S.winner, line };
  }

  /* 手番の順（前のセーブには order が無いので、そのときは席の順） */
  const orderOf = (S) => (S.order && S.order.length === S.players.length ? S.order : S.players.map((p, i) => i));
  function startTurn(S) { const o = orderOf(S); S.opos = 0; S.turn = o[0]; S.round = 1; }
  function nextTurn(S) {
    S.sel = null;
    S.moves++;
    if (S.phase !== "play") return;
    const o = orderOf(S);
    const at0 = o.indexOf(S.turn);
    S.opos = (at0 + 1) % o.length;
    S.turn = o[S.opos];
    if (S.opos === 0) {
      S.round = (S.round || 1) + 1;
      /* ★ 決着がつかないまま MAX_ROUNDS 周したら引き分け（★★ 2026-10-14 全員が CPU のときだけ） */
      if (S.round > MAX_ROUNDS && allCpu(S)) { S.phase = "end"; S.draw = true; S.winner = null; S.endedAt = Date.now(); return; }
    }
    /* ★ ブロックは「置いた人の次の番」が来たら消える */
    if (S.blks && S.blks.length) {
      S.blks = S.blks.filter((b) => {
        if (b.by !== S.turn) return true;
        if (S.cells[idx(S, b.x, b.y)] === BLOCK) S.cells[idx(S, b.x, b.y)] = -1;
        return false;
      });
    }
  }

  /* ══ ★★ 2026-10-24 守りの点（ご指定「自分以外のプレイヤーの、あと一つで揃う状態を自分で防御する位置に置いたときに点」）══
     手を指す<b>前</b>の盤で、そのマスが「ほかの人の駒が入ればそろうマス」なら、その人数ぶん +1（S.def[自分の番号]）。
     置く・動かす（行き先）・ブロック（タクティクス）が対象。一手もどる（盤面ごと戻る）と点も戻る。 */
  function threatsAt(S, x, y, me) {
    if (!inBoard(S, x, y) || at(S, x, y) !== -1) return 0;
    const i = idx(S, x, y);
    let n = 0;
    S.players.forEach((p) => {
      if (p.slot === me) return;
      S.cells[i] = p.slot;
      if (lineAt(S, x, y)) n++;
      S.cells[i] = -1;
    });
    return n;
  }
  function addDef(S, me, n) { if (!n) return; S.def = (S.def && typeof S.def === "object") ? S.def : {}; S.def[me] = (S.def[me] || 0) + n; }

  /* ══ 手番の操作（画面と CPU はこれだけ呼ぶ） ══ */
  function place(S, x, y) {
    if (!canPlace(S, x, y)) return null;
    const me = S.turn;
    addDef(S, me, threatsAt(S, x, y, me));
    S.cells[idx(S, x, y)] = me;
    S.log.push({ t: "place", slot: me, x, y });
    S.last = { t: "place", slot: me, x, y };
    const w = checkWin(S, x, y);
    nextTurn(S);
    return { kind: "place", slot: me, x, y, win: w };
  }
  function move(S, fx, fy, tx, ty) {
    if (!canMove(S, fx, fy, tx, ty)) return null;
    const me = S.turn;
    addDef(S, me, threatsAt(S, tx, ty, me));     /* ★★ 2026-10-24 守りの点（行き先） */
    S.cells[idx(S, fx, fy)] = -1;
    S.cells[idx(S, tx, ty)] = me;
    S.log.push({ t: "move", slot: me, fx, fy, x: tx, y: ty });
    S.last = { t: "move", slot: me, fx, fy, x: tx, y: ty };
    const w = checkWin(S, tx, ty);
    nextTurn(S);
    return { kind: "move", slot: me, fx, fy, x: tx, y: ty, win: w };
  }
  /* ★ 押す。押した先で<b>押された人の駒がそろったら、その人の勝ち</b>（押しかたに気をつける読み合い） */
  function push(S, fx, fy, tx, ty) {
    const p = pushesOf(S, fx, fy).find((q) => q.tx === tx && q.ty === ty);
    if (!p) return null;
    const me = S.turn;
    S.cells[idx(S, tx, ty)] = -1;
    S.cells[idx(S, p.x, p.y)] = p.who;
    S.log.push({ t: "push", slot: me, fx, fy, tx, ty, x: p.x, y: p.y, who: p.who });
    S.last = { t: "push", slot: me, fx, fy, tx, ty, x: p.x, y: p.y, who: p.who };
    const w = checkWin(S, p.x, p.y);
    nextTurn(S);
    return { kind: "push", slot: me, fx, fy, tx, ty, x: p.x, y: p.y, who: p.who, win: w };
  }
  function block(S, x, y) {
    if (!canBlock(S, x, y)) return null;
    const me = S.turn;
    addDef(S, me, threatsAt(S, x, y, me));       /* ★★ 2026-10-24 守りの点（ブロックで防いだ） */
    S.cells[idx(S, x, y)] = BLOCK;
    S.blockLeft[me] = (S.blockLeft[me] || 0) - 1;
    S.blks.push({ x, y, by: me });
    S.log.push({ t: "block", slot: me, x, y });
    S.last = { t: "block", slot: me, x, y };
    nextTurn(S);
    return { kind: "block", slot: me, x, y, win: null };
  }
  function pass(S) { S.log.push({ t: "pass", slot: S.turn }); S.last = null; nextTurn(S); }

  /* その人ができることが1つでもあるか（置く・動かす・押す・ブロック） */
  function canAct(S, slot) {
    if (S.phase !== "play") return false;
    const keep = S.turn; S.turn = slot;
    let ok = false;
    try {
      if (S.cells.indexOf(-1) >= 0 && (!S.maxPieces || countOf(S, slot) < S.maxPieces)) ok = true;
      if (!ok && isTactics(S) && (S.blockLeft[slot] || 0) > 0 && S.cells.indexOf(-1) >= 0) ok = true;
      for (let y = 0; !ok && y < S.size; y++) for (let x = 0; !ok && x < S.size; x++) {
        if (at(S, x, y) === slot && (movesOf(S, x, y).length || pushesOf(S, x, y).length)) ok = true;
      }
    } finally { S.turn = keep; }
    return ok;
  }
  /* 置く場所も動かせる駒もない＝その人はパス */
  const stuck = (S) => S.phase === "play" && !canAct(S, S.turn);
  /* ★★ 2026-10-20 ご指定「途中離脱した人の分を途中から CPU として動かせるように」
     席の「人／CPU」を試合の途中で入れかえる（sub＝途中から CPU にした印。人にもどすと消える）。
     ★ CPU にした席は賞金・戦績の対象外（shift-account.js の report が type を見る） */
  function setType(S, slot, type) {
    const p = S && S.players[slot]; if (!p) return false;
    const t = type === "cpu" ? "cpu" : "human";
    if (p.type === t) return false;
    p.type = t;
    if (t === "cpu") p.sub = Date.now(); else delete p.sub;
    S.log.push({ t: "seat", slot, to: t });
    return true;
  }

  /* 成績（試合結果の並び）。勝った人が1位、あとは置いた駒のいちばん長い並びが長い順
     ★★ 2026-10-16 ご指定「2位以降の決めかたと、同じ数のときを決めて表示」：
       ① 勝った人（そろえた人）が1位
       ② 2位からは「いちばん長い並び（最長）」が長い順
       ③ 最長が同じなら「盤の上の自分の駒の数」が多い順
       ④ それでも同じなら<b>同じ順位</b>（例：2位・2位・4位）。賞金も同じ順位なら同じ額（Shift.PRIZE_RULE） */
  /* ★★ 2026-10-24 ご指定「2位以降の順位の決定方法を変更：守りの合計得点が高いほど高順位。影響は 長さの得点 3割・守り 7割」
       ① 勝った人（そろえた人）が1位（変わらない）
       ② 2位から：点＝ 0.3 ×（最長 ÷（並べる数−1）・1 まで）＋ 0.7 ×（守りの点 ÷ いちばん多い人の守りの点）の高い順
       ③ 点が同じなら最長 → 駒の数 → それでも同じなら同じ順位（賞金も同じ額） */
  const W_LINE = 0.3, W_DEF = 0.7;
  function standings(S) {
    const defOf = (slot) => Math.max(0, Number(S.def && S.def[slot]) || 0);
    const defMax = Math.max(0, ...S.players.map((p) => defOf(p.slot)));
    const best = S.players.map((p) => {
      let m = 0;
      for (let y = 0; y < S.size; y++) for (let x = 0; x < S.size; x++) {
        if (at(S, x, y) !== p.slot) continue;
        [[1, 0], [0, 1], [1, 1], [1, -1]].forEach(([dx, dy]) => {
          let n = 1;
          for (let k = 1; k < S.size; k++) { if (at(S, x + dx * k, y + dy * k) !== p.slot) break; n++; }
          if (n > m) m = n;
        });
      }
      const def = defOf(p.slot);
      const lp = W_LINE * Math.min(1, m / Math.max(1, S.win - 1)), dp = W_DEF * (defMax > 0 ? def / defMax : 0);
      /* ★★ 2026-10-24 内訳（lp＝長さの点・dp＝守りの点。どちらも 100 点満点に直した値）も結果の画面で見せる */
      return { slot: p.slot, line: m, pieces: countOf(S, p.slot), def: def, defMax: defMax, lp: Math.round(lp * 1000) / 10, dp: Math.round(dp * 1000) / 10, score: Math.round((lp + dp) * 1000) / 10 };
    });
    const cmp = (a, b) => (b.slot === S.winner) - (a.slot === S.winner) || b.score - a.score || b.line - a.line || b.pieces - a.pieces;
    const list = S.players.map((p, i) => Object.assign({}, p, best[i])).sort(cmp);
    let r = 0;
    return list.map((p, i) => { if (i === 0 || cmp(list[i - 1], p) !== 0) r = i + 1; return Object.assign(p, { rank: r, tie: false }); })
      .map((p, i, a) => Object.assign(p, { tie: a.some((q) => q !== p && q.rank === p.rank) }));
  }

  /* ══ 保存（中断してもつづきから遊べる） ══
     ★★ 2026-10-14 ご指定「中断の保存を複数個できるように」
     ・前は1つの枠（magishift_v1）だけで、新しい試合をはじめると前の中断が上書きされていた。
     ・いまは<b>試合ごとの枠</b>：試合には gid（番号）があり、その試合の手番のたびに自分の枠へ書く（自動セーブ）。
       一覧（magishift_saves_v1）には枠ごとの「顔ぶれ・ルール・周回・日時」だけを持つ（一覧を出すのに本体を読まない）。
       本体は枠ごとのキー（magishift_s_<gid>）。一手もどる用の記録（hist）もいっしょに残す（最後の30手ぶん）。
     ・枠は MAX_SAVES まで。こえたら、いちばん古い枠を消す（save の戻り値で知らせる）。
     ・決着した試合・「セーブせずにやめる」の試合は枠ごと消す（remove）。
     ・前の版の1つだけのセーブは、はじめて一覧を読むときに枠へ移す。 */
  const KEY = "magishift_v1";               /* 前の版（1つだけ） */
  const IDX = "magishift_saves_v1";
  const SKEY = (gid) => "magishift_s_" + gid;
  const MAX_SAVES = 10;
  function newGid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function idxLoad() { try { const a = JSON.parse(localStorage.getItem(IDX) || "null"); return Array.isArray(a) ? a.filter((x) => x && x.gid) : []; } catch (e) { return []; } }
  function idxSave(a) { try { localStorage.setItem(IDX, JSON.stringify(a)); } catch (e) {} }
  function metaOf(S) {
    return { players: S.players.map((p) => ({ name: p.name, color: p.color, mark: p.mark, type: p.type || "human" })),
      mode: S.mode || "normal", size: S.size, win: S.win, round: S.round || 1, moves: S.moves || 0, turn: S.turn };
  }
  let migrated = false;
  function migrate() {
    if (migrated) return; migrated = true;
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return;
      const d = JSON.parse(raw);
      if (d && d.S && d.S.phase === "play") {
        upgrade(d.S);
        if (!d.S.gid) d.S.gid = newGid();
        const list = idxLoad();
        if (!list.some((x) => x.gid === d.S.gid)) {
          localStorage.setItem(SKEY(d.S.gid), JSON.stringify({ v: 3, S: d.S, hist: [], at: d.at || Date.now() }));
          list.push({ gid: d.S.gid, at: d.at || Date.now(), meta: metaOf(d.S) });
          list.sort((a, b) => b.at - a.at); idxSave(list);
        }
      }
      localStorage.removeItem(KEY);
    } catch (e) {}
  }
  /* S の枠を書きかえる（無ければ足す）。枠がいっぱいでいちばん古い枠を消したときは、その一覧の行を返す */
  function save(S, hist) {
    if (!S || S.phase !== "play" || S.sandbox) return null;   /* ★★ 2026-10-24 終局後の「試し」の対局は保存しない */
    migrate();
    if (!S.gid) S.gid = newGid();
    let dropped = null;
    try {
      const c = Object.assign({}, S, { sel: null }), now = Date.now();
      localStorage.setItem(SKEY(S.gid), JSON.stringify({ v: 3, S: c, hist: (hist || []).slice(-30), at: now }));
      const list = idxLoad().filter((x) => x.gid !== S.gid);
      list.unshift({ gid: S.gid, at: now, meta: metaOf(S) });
      while (list.length > MAX_SAVES) { dropped = list.pop(); try { localStorage.removeItem(SKEY(dropped.gid)); } catch (e) {} }
      idxSave(list);
    } catch (e) {}
    return dropped;
  }
  /* gid の枠を読む（gid なし＝いちばん新しい枠）→ { S, hist, at } */
  function load(gid) {
    migrate();
    try {
      const list = idxLoad();
      const row = gid ? list.find((x) => x.gid === gid) : list[0];
      if (!row) return null;
      const d = JSON.parse(localStorage.getItem(SKEY(row.gid)) || "null");
      if (!d || !d.S) { remove(row.gid); return null; }
      upgrade(d.S); if (!d.S.gid) d.S.gid = row.gid;
      return { S: d.S, hist: Array.isArray(d.hist) ? d.hist : [], at: d.at || row.at };
    } catch (e) { return null; }
  }
  /* 中断中の試合の一覧（新しい順） */
  function list() { migrate(); return idxLoad(); }
  function remove(gid) {
    if (!gid) return;
    try { localStorage.removeItem(SKEY(gid)); } catch (e) {}
    idxSave(idxLoad().filter((x) => x.gid !== gid));
  }
  /* 前の呼び方（引数なし）は「いまの試合の枠を消す」ではなく何もしない。S か gid を渡す */
  function clear(Sg) { remove(Sg && typeof Sg === "object" ? Sg.gid : Sg); }

  Object.assign(MS, {
    RULES, MODES, COLORS, looks, BLOCKS, BLOCK, MAX_ROUNDS, MAX_SAVES, DIR8, allCpu, MAX_PLAYERS, setType,
    newGame, upgrade, place, move, push, block, pass, movesOf, pushesOf, canPlace, canPick, canMove, canPush, canBlock,
    shuffleOrder, orderOf, startTurn, isTactics, canAct,
    at, inBoard, cur, countOf, leftOf, outOfPieces, checkWin, lineAt, stuck, standings, save, load, list, remove, clear, KEY,
  });
})();
