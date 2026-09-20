/* ============================================================
   MagiShift — ルールの本体（2026-09-21 新作）
   ------------------------------------------------------------
   マルバツゲームを発展させた 2〜6人のボードゲーム。
   ★ このゲームの要：<b>置いた駒をあとから動かせる</b>。
     そのため盤面はいつも変わり、最後まで逆転がある。

   ・自分の手番でできることは「置く」か「自分の駒を動かす」のどちらか1つ。
   ・並べる数（勝利条件）を、たて・よこ・ななめ のどれかでそろえたら勝ち。
   ・人数で盤面の広さと勝利条件が変わる（RULES。あとから数字だけ変えられる）。

   ★ 画面（shift-ui.js）はこのファイルの関数だけを呼ぶ。盤面の状態はここだけが持つ。
     あとから「特殊マス」「アイテム」「CPU」を足しても、ここに足すだけで済むようにしてある。
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
  const RULES = {
    2: { size: 5, win: 4, pieces: 6, move: 2 },
    3: { size: 6, win: 4, pieces: 6, move: 2 },
    4: { size: 7, win: 4, pieces: 6, move: 2 },
    5: { size: 8, win: 5, pieces: 7, move: 2 },
    6: { size: 9, win: 5, pieces: 7, move: 2 },
  };
  /* pieces:0 ＝ 置ける数に上限なし。move ＝ 1手で動ける距離（たて・よこ・ななめ） */

  /* ══ プレイヤーの色と印（色だけに頼らないよう、印と番号も付ける） ══ */
  const COLORS = [
    { id: 0, name: "レッド",   color: "#e5484d", mark: "circle" },
    { id: 1, name: "ブルー",   color: "#2a77e8", mark: "cross" },
    { id: 2, name: "グリーン", color: "#12a05c", mark: "triangle" },
    { id: 3, name: "イエロー", color: "#eab308", mark: "square" },
    { id: 4, name: "パープル", color: "#8b5cf6", mark: "star" },
    { id: 5, name: "オレンジ", color: "#f97316", mark: "hex" },
  ];

  const idx = (S, x, y) => y * S.size + x;
  const inBoard = (S, x, y) => x >= 0 && y >= 0 && x < S.size && y < S.size;
  const at = (S, x, y) => (inBoard(S, x, y) ? S.cells[idx(S, x, y)] : -1);

  /* ══ 新しい試合をつくる ══
     players … [{ uid, name, charFile }]（XEVARION の紐づけは shift-account.js が用意する） */
  function newGame(players, opt) {
    const n = players.length;
    const base = RULES[n] || RULES[4];
    const size = (opt && opt.size) || base.size;
    const win = (opt && opt.win) || base.win;
    return {
      size, win, move: (opt && opt.move) || base.move, maxPieces: (opt && opt.pieces) || base.pieces,
      players: players.map((p, i) => Object.assign({ slot: i, wins: 0 }, COLORS[i], p)),
      cells: new Array(size * size).fill(-1),      /* -1 ＝ 空き。それ以外は置いた人の番号 */
      turn: 0, phase: "play", winner: null, line: null, moves: 0, startedAt: Date.now(), log: [],
      sel: null,                                    /* 動かすために選んでいる駒 { x, y } */
    };
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
  /* その駒が動ける先（たて・よこ・ななめに move マスまで。ほかの駒は飛びこえられない） */
  function movesOf(S, x, y) {
    const out = [];
    if (!canPick(S, x, y)) return out;
    [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dx, dy]) => {
      for (let k = 1; k <= S.move; k++) {
        const nx = x + dx * k, ny = y + dy * k;
        if (!inBoard(S, nx, ny) || at(S, nx, ny) !== -1) break;
        out.push({ x: nx, y: ny });
      }
    });
    return out;
  }
  const canMove = (S, fx, fy, tx, ty) => movesOf(S, fx, fy).some((m) => m.x === tx && m.y === ty);

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

  function nextTurn(S) {
    S.sel = null;
    S.moves++;
    if (S.phase !== "play") return;
    S.turn = (S.turn + 1) % S.players.length;
  }

  /* ══ 手番の操作（画面はこの3つだけ呼ぶ） ══ */
  function place(S, x, y) {
    if (!canPlace(S, x, y)) return null;
    S.cells[idx(S, x, y)] = S.turn;
    S.log.push({ t: "place", slot: S.turn, x, y });
    const w = checkWin(S, x, y);
    nextTurn(S);
    return { kind: "place", x, y, win: w };
  }
  function move(S, fx, fy, tx, ty) {
    if (!canMove(S, fx, fy, tx, ty)) return null;
    S.cells[idx(S, fx, fy)] = -1;
    S.cells[idx(S, tx, ty)] = S.turn;
    S.log.push({ t: "move", slot: S.turn, fx, fy, x: tx, y: ty });
    const w = checkWin(S, tx, ty);
    nextTurn(S);
    return { kind: "move", fx, fy, x: tx, y: ty, win: w };
  }
  function pass(S) { S.log.push({ t: "pass", slot: S.turn }); nextTurn(S); }

  /* 盤面がいっぱいで、動かすこともできない＝引き分け */
  function stuck(S) {
    if (S.phase !== "play") return false;
    if (S.cells.indexOf(-1) >= 0 && (!S.maxPieces || countOf(S, S.turn) < S.maxPieces)) return false;
    for (let y = 0; y < S.size; y++) for (let x = 0; x < S.size; x++) {
      if (at(S, x, y) === S.turn && movesOf(S, x, y).length) return false;
    }
    return true;
  }

  /* 成績（試合結果の並び）。勝った人が1位、あとは置いた駒のいちばん長い並びが長い順 */
  function standings(S) {
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
      return { slot: p.slot, line: m, pieces: countOf(S, p.slot) };
    });
    return S.players.map((p, i) => Object.assign({}, p, best[i]))
      .sort((a, b) => (b.slot === S.winner) - (a.slot === S.winner) || b.line - a.line || b.pieces - a.pieces)
      .map((p, i) => Object.assign(p, { rank: i + 1 }));
  }

  /* ══ 保存（中断してもつづきから遊べる） ══ */
  const KEY = "magishift_v1";
  function save(S, stats) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, S, stats, at: Date.now() })); } catch (e) {}
  }
  function load() {
    try { const d = JSON.parse(localStorage.getItem(KEY) || "null"); return d && d.S ? d : null; } catch (e) { return null; }
  }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  Object.assign(MS, {
    RULES, COLORS, newGame, place, move, pass, movesOf, canPlace, canPick, canMove,
    at, inBoard, cur, countOf, leftOf, outOfPieces, checkWin, stuck, standings, save, load, clear, KEY,
  });
})();
