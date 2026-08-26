/* ============================================================
   MagiBurst ONLINE — 黄昏の王城 マルチプレイ（部屋番号・最大4人）
   ・DBは MagiBurst 専用の Firebase（プロジェクト magiburst）RTDB を利用。
     アカウント（xevarion-account）とは xevarion-fb.js 経由で連携する。
     部屋キーは従来どおり "B"+4桁（旧DBからの移行データと互換）。
   ・同期方式は「決定論ロックステップ」。部屋の seed とショット列（角度・強さ・SS有無）だけを
     共有し、各端末が同じシミュレーションを再生する（固定タイムステップ＋シード乱数）。
   window.BurstOnline として公開。
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getDatabase, ref, set, update, get, onValue, off,
  runTransaction, onDisconnect, remove, push, onChildAdded,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAEobH5IHlUNR3ryHKxsYNgHlIFSzNTJ7M",
  authDomain: "magiburst.firebaseapp.com",
  databaseURL: "https://magiburst-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "magiburst",
  storageBucket: "magiburst.firebasestorage.app",
  messagingSenderId: "107493819618",
  appId: "1:107493819618:web:727adc2ff9fcf00713cabb",
  measurementId: "G-907875JXTS",
};
const app = initializeApp(firebaseConfig, "burst-online");
const db = getDatabase(app);

const MAX_PLAYERS = 4;
let cur = null;      // { code, uid, host }
let refs = [];       // 購読解除用
let started = false;
let lastRound = -1;  // 連続プレイ用：ラウンドが変わるたびに onStart を発火

const roomPath = (code) => "rooms/B" + code;
const gen4 = () => String(Math.floor(1000 + Math.random() * 9000));

function playerNode(p) {
  /* chars = 持ちよるキャラ（最大2体）。人数によって使う数が決まる（2人=2体ずつ／3人=ホスト2体＋1体ずつ／4人=1体ずつ） */
  const chars = (p.chars || []).slice(0, 2).map((c) => ({
    id: String(c.id), lv: c.lv | 0, awk: c.awk | 0, fruit: c.fruit || "",
  }));
  return {
    name: String(p.name || "?").slice(0, 12),
    charId: chars[0] ? chars[0].id : p.charId,   // 表示用（後方互換）
    lv: chars[0] ? chars[0].lv : (p.lv | 0),
    awk: chars[0] ? chars[0].awk : (p.awk | 0),
    fruit: chars[0] ? chars[0].fruit : (p.fruit || ""),
    chars,
    /* ★★ 2026-08-24 蓬莱の九重のマルチ対応。
       tenkyu = その人が<b>蓬莱天宮の挑戦条件</b>（第一重〜第九重をすべてクリア）を
       満たしているか。ご指定により、蓬莱天宮は<b>ホストを含む全員</b>が
       満たしていないと始められない。部屋の側で判定できるよう、ここで持ちよる。
       ★ 古い版のクライアントは送ってこないので、受け取る側は
         「undefined ＝ 分からない ＝ 満たしていない」として扱うこと。 */
    tenkyu: !!p.tenkyu,
    th: p.th || "", online: true, left: false, joined: Date.now(),
  };
}

/* ── 部屋をつくる ── */
async function create(profile, stageId) {
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = gen4();
      const rref = ref(db, roomPath(code));
      let made = false;
      const res = await runTransaction(rref, (room) => {
        if (room) return;   // 使用中 → 次の候補
        made = true;
        return {
          meta: {
            host: profile.uid, stage: stageId, status: "lobby",
            seed: (Math.floor(Math.random() * 2147483646) + 1) | 0,
            created: Date.now(),
          },
          players: { [profile.uid]: playerNode(profile) },
        };
      });
      if (res.committed && made) {
        cur = { code, uid: profile.uid, host: true };
        started = false; lastRound = -1;
        afterEnter(code, profile.uid);
        return { code };
      }
    }
    return { error: "busy" };
  } catch (e) {
    return { error: /permission/i.test(String(e)) ? "denied" : "fail" };
  }
}

/* ── 部屋に入る ── */
async function join(code, profile) {
  try {
    const rref = ref(db, roomPath(code));
    let err = null;
    const res = await runTransaction(rref, (room) => {
      if (room === null) return null;                       // キャッシュ無し → サーバー値で再実行
      if (!room || !room.meta) { err = "nofound"; return; }
      if (room.meta.status !== "lobby") { err = "started"; return; }
      const ps = room.players || {};
      if (!ps[profile.uid] && Object.keys(ps).length >= MAX_PLAYERS) { err = "full"; return; }
      room.players = ps;
      room.players[profile.uid] = playerNode(profile);
      return room;
    });
    if (err) return { error: err };
    const snap = await get(rref);
    if (!snap.exists()) return { error: "nofound" };
    if (!res.committed) return { error: "fail" };
    cur = { code, uid: profile.uid, host: snap.val().meta.host === profile.uid };
    started = false; lastRound = -1;
    afterEnter(code, profile.uid);
    return { ok: true, meta: snap.val().meta };
  } catch (e) {
    return { error: /permission/i.test(String(e)) ? "denied" : "fail" };
  }
}

/* ── 接続の生存確認（v12） ──
   ★ 旧実装は onDisconnect で online:false / left:true を書き込むだけだった。
     そのため「一瞬だけ回線が切れて、すぐ復帰した」場合でも online が false のまま戻らず、
     オンラインなのに「接続が切れました」と判定されて負け扱いになっていた。
   いまは
     ・.info/connected を監視して、つながり直すたびに online:true / left:false を書き戻す
     ・4秒ごとに alive（心拍）を更新する
     ・onDisconnect では left は立てない（left は「自分から退出した」ときだけ）
   にして、相手側は「心拍が止まったかどうか」で判定する。 */
const HEARTBEAT_MS = 4000;
let hbTimer = null;
function afterEnter(code, uid) {
  const pPath = roomPath(code) + "/players/" + uid;
  try {
    const conRef = ref(db, ".info/connected");
    onValue(conRef, (s) => {
      if (!s.val() || !cur || cur.code !== code) return;
      try { onDisconnect(ref(db, pPath + "/online")).set(false); } catch (e) {}
      update(ref(db, pPath), { online: true, left: false, alive: Date.now() }).catch(() => {});
    });
    refs.push(conRef);
  } catch (e) {}
  if (hbTimer) clearInterval(hbTimer);
  hbTimer = setInterval(() => {
    if (!cur) { clearInterval(hbTimer); hbTimer = null; return; }
    update(ref(db, roomPath(cur.code) + "/players/" + cur.uid), { alive: Date.now(), online: true }).catch(() => {});
  }, HEARTBEAT_MS);
}

/* ── 監視（ロビー＋ショット） ── */
function watch(cbs) {
  unwatchAll();
  if (!cur) return;
  const base = roomPath(cur.code);
  const r1 = ref(db, base);
  const cb1 = onValue(r1, (s) => {
    const room = s.val();
    if (!room) { if (cbs.onClosed) cbs.onClosed(); return; }
    if (cbs.onRoom) cbs.onRoom(room);
    /* ラウンドが変わるたびに onStart（初回＝round0、連続プレイ＝round1,2,…） */
    if (room.meta && room.meta.status === "playing" && room.meta.order) {
      const rd = room.meta.round | 0;
      if (rd !== lastRound) { lastRound = rd; started = true; if (cbs.onStart) cbs.onStart(room); }
    }
    /* ホストがバトルを中断した（＝接続が切れた扱い） */
    if (room.meta && room.meta.status === "aborted" && cbs.onAbort) cbs.onAbort(room);
  });
  refs.push(r1);
  const r2 = ref(db, base + "/shots");
  const cb2 = onChildAdded(r2, (s) => {
    const v = s.val();
    if (v && cbs.onShot) cbs.onShot(v);
  });
  refs.push(r2);
  /* ホストが手番の終わりに送る「盤面スナップショット」。ゲストはこれで状態をそろえる */
  const r3 = ref(db, base + "/sync");
  const cb3 = onValue(r3, (s) => {
    const v = s.val();
    if (v && cbs.onSync) cbs.onSync(v);
  });
  refs.push(r3);
}
function unwatchAll() {
  for (const r of refs) { try { off(r); } catch (e) {} }
  refs = [];
}

/* ── 部屋の並び順（ホストがロビーで手動で入れ替えられる） ──
   meta.forder に uid の並びを保存する。start() / nextRound() はこれを優先して手番を決める。 */
async function setOrder(order) {
  if (!cur || !cur.host) return { error: "nothost" };
  try {
    await update(ref(db, roomPath(cur.code) + "/meta"), { forder: order.slice() });
    return { ok: true };
  } catch (e) { return { error: "fail" }; }
}
/* ── 4体ぶんの手番の並び（ホストがロビーで1体単位に入れ替える） ──
   meta.slots に "プレイヤー番号:何体目か" の配列を保存する（例 ["0:0","1:0","0:1","1:1"]）。
   人数が変わると並びが合わなくなるので、クライアント側で妥当性を検証してから使う。 */
async function setSlots(slots) {
  if (!cur || !cur.host) return { error: "nothost" };
  try {
    await update(ref(db, roomPath(cur.code) + "/meta"), { slots: slots.slice() });
    return { ok: true };
  } catch (e) { return { error: "fail" }; }
}
/* 参加者を「ホストが決めた並び（forder）」→「参加した順」の優先度で並べる */
function orderedUids(room, keepLeft) {
  const ps = room.players || {};
  let uids = Object.keys(ps).filter((uid) => (keepLeft ? true : !ps[uid].left));
  const forced = (room.meta && room.meta.forder) || null;
  if (Array.isArray(forced) && forced.length) {
    const rank = {};
    forced.forEach((uid, i) => { rank[uid] = i; });
    uids.sort((a, b) => {
      const ra = rank[a] == null ? 999 : rank[a], rb = rank[b] == null ? 999 : rank[b];
      if (ra !== rb) return ra - rb;
      return (ps[a].joined || 0) - (ps[b].joined || 0);
    });
    return uids;
  }
  return uids.sort((a, b) => (ps[a].joined || 0) - (ps[b].joined || 0));
}

/* ── ホストが開始（参加者の順番を確定して配る） ── */
async function start() {
  if (!cur || !cur.host) return { error: "nothost" };
  try {
    const snap = await get(ref(db, roomPath(cur.code)));
    const room = snap.val();
    if (!room || !room.players) return { error: "fail" };
    const order = orderedUids(room, true);
    if (order.length < 2) return { error: "few" };
    await update(ref(db, roomPath(cur.code) + "/meta"), {
      status: "playing", order, round: 0, started: Date.now(),
    });
    return { ok: true };
  } catch (e) { return { error: "fail" }; }
}

/* ── ホストが同じメンバーで次のクエストへ（連続プレイ） ── */
async function nextRound(stageId) {
  if (!cur || !cur.host) return { error: "nothost" };
  try {
    const snap = await get(ref(db, roomPath(cur.code)));
    const room = snap.val();
    if (!room || !room.players) return { error: "fail" };
    /* まだ残っている（抜けていない）プレイヤーで順番を作り直す（ホスト指定の並びを優先） */
    const order = orderedUids(room, false);
    if (order.length < 2) return { error: "few" };
    /* 前ラウンドのショット列・同期スナップショットを消してから、新しい seed／round で開始 */
    try { await remove(ref(db, roomPath(cur.code) + "/shots")); } catch (e) {}
    try { await remove(ref(db, roomPath(cur.code) + "/sync")); } catch (e) {}
    const round = ((room.meta && room.meta.round) | 0) + 1;
    await update(ref(db, roomPath(cur.code) + "/meta"), {
      status: "playing", stage: stageId, order, round,
      seed: (Math.floor(Math.random() * 2147483646) + 1) | 0, started: Date.now(),
    });
    return { ok: true };
  } catch (e) { return { error: "fail" }; }
}

/* ── ホストがバトルを中断する（ゲストには「接続が切れた」と表示される） ── */
async function abort(reason) {
  if (!cur || !cur.host) return { error: "nothost" };
  try {
    await update(ref(db, roomPath(cur.code) + "/meta"), {
      status: "aborted", abortedBy: cur.uid, reason: reason || "host", abortedAt: Date.now(),
    });
    return { ok: true };
  } catch (e) { return { error: "fail" }; }
}

/* ── ショット送信（角度・強さ・SS有無だけ） ── */
function sendShot(s) {
  if (!cur) return;
  set(ref(db, roomPath(cur.code) + "/shots/" + s.seq), {
    seq: s.seq | 0,
    ux: +Number(s.ux).toFixed(5), uy: +Number(s.uy).toFixed(5),
    power: +Number(s.power).toFixed(5), ss: !!s.ss,
    uid: cur.uid, t: Date.now(),
  }).catch(() => {});
}

/* ── ホストの盤面スナップショット送信（ターン終わりのズレ補正） ──
   1か所（/sync）を上書きし続けるだけなので通信量はごく小さい。 */
function sendSync(state) {
  if (!cur || !cur.host) return;
  set(ref(db, roomPath(cur.code) + "/sync"), state).catch(() => {});
}

/* ── 退出 ── */
async function leave() {
  if (!cur) return;
  const { code, uid, host } = cur;
  unwatchAll();
  if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
  cur = null; started = false; lastRound = -1;
  try {
    const snap = await get(ref(db, roomPath(code)));
    const room = snap.val();
    if (room && host && room.meta && room.meta.status === "lobby") {
      await remove(ref(db, roomPath(code)));                 // ロビーのままホストが退出 → 部屋を削除
    } else {
      await update(ref(db, roomPath(code) + "/players/" + uid), { online: false, left: true });
      const s2 = await get(ref(db, roomPath(code) + "/players"));
      const ps = s2.val() || {};
      const anyone = Object.keys(ps).some((k) => !ps[k].left);
      if (!anyone) await remove(ref(db, roomPath(code)));    // 誰もいなくなったら掃除
    }
  } catch (e) {}
}

/* ── 同じメンバーで「ロビーに戻す」（連戦のまえに編成を編集できるようにする。ホストのみ） ── */
async function toLobby(stageId) {
  if (!cur || !cur.host) return { error: "nothost" };
  try {
    try { await remove(ref(db, roomPath(cur.code) + "/shots")); } catch (e) {}
    try { await remove(ref(db, roomPath(cur.code) + "/sync")); } catch (e) {}
    const upd = { status: "lobby", order: null };
    if (stageId) upd.stage = stageId;
    await update(ref(db, roomPath(cur.code) + "/meta"), upd);
    started = false; lastRound = -1;
    return { ok: true };
  } catch (e) { return { error: "fail" }; }
}

/* ── ロビーで持ちよるキャラを変更する（自分のプレイヤーノードの chars を更新） ── */
async function updateChars(chars, th) {
  if (!cur) return { error: "noroom" };
  /* ★ 2026-08-05: 魂の紋章（emblem）も持ちよる。
     紋章はダメージ倍率を変えるので、全員の端末で同じ値を使わないと
     「自分の画面だけ与ダメージが違う」＝盤面がズレる。必ずここで共有すること。 */
  const cs = (chars || []).slice(0, 2).map((c) => ({
    id: String(c.id), lv: c.lv | 0, awk: c.awk | 0,
    fruit: c.fruit || "", fruits: c.fruits || [], emblem: c.emblem || [],
  }));
  try {
    await update(ref(db, roomPath(cur.code) + "/players/" + cur.uid), {
      chars: cs,
      charId: cs[0] ? cs[0].id : "", lv: cs[0] ? cs[0].lv : 0, awk: cs[0] ? cs[0].awk : 0, fruit: cs[0] ? cs[0].fruit : "",
      th: th || "",
    });
    return { ok: true };
  } catch (e) { return { error: "fail" }; }
}

window.addEventListener("beforeunload", () => { if (cur) { try { leave(); } catch (e) {} } });

window.BurstOnline = {
  create, join, watch, start, nextRound, toLobby, leave, sendShot, abort, setOrder, setSlots, sendSync, updateChars,
  isHost: () => !!(cur && cur.host),
  myUid: () => (cur ? cur.uid : null),
  code: () => (cur ? cur.code : null),
  inRoom: () => !!cur,
  MAX_PLAYERS,
};
window.dispatchEvent(new Event("burstonline:ready"));
