/* ============================================================
   MagiDiamond ONLINE — 部屋番号でつながる2台対戦
   ・ゲーム状態は XEVARION オンライン用 Firebase（xevarion-online）RTDB の rooms/D{4桁} に保存
     （チェインパーティ=純4桁 / MagiManor=M / MagiResonance=R / MagiBurst=B と非衝突）
   ・両端末が picks/{seq}/{def|off} に選択を書き、ホストが判定して
     state（events + 新しい試合状態）を配信。両端末で同時に演出を再生する。
   ・報酬は XEVARION(xevarion-fb.js)の awardXeva（rewarded フラグで二重防止）
   window.MDOnline として公開。読み込み完了で "mdonline:ready" を発火。
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getDatabase, ref, set, update, get, onValue, off,
  runTransaction, onDisconnect, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAivkOwjWlmqJSNmnSjOs4-PUAcVFOfbiY",
  authDomain: "xevarion-online.firebaseapp.com",
  databaseURL: "https://xevarion-online-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "xevarion-online",
  storageBucket: "xevarion-online.firebasestorage.app",
  messagingSenderId: "513584168485",
  appId: "1:513584168485:web:d2a009325df677b746c9cc",
  measurementId: "G-28C5G2BFR5"
};
const app = initializeApp(firebaseConfig, "md-online");
const db = getDatabase(app);

const ROOMS = "rooms";
/* オンライン対戦の賞金（XEVA・ポータルで受取） 勝ち/負け/引き分け */
const PRIZE_WIN = 250, PRIZE_LOSE = 80, PRIZE_DRAW = 120;

let cur = null; // { code, uid }
let roomRef = null, stateRef = null, picksRef = null, connRef = null;

function roomPath(code) { return ROOMS + "/D" + code; }
function gen4() { return String(Math.floor(1000 + Math.random() * 9000)); }

/* ── 部屋作成（ホスト） ── */
async function createRoom(profile, opts) {
  const uid = profile.uid;
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = gen4();
      const rref = ref(db, roomPath(code));
      const res = await runTransaction(rref, (room) => {
        if (room) return; // 使用中 → 次のコード
        return {
          meta: { host: uid, innings: opts.innings || 3, status: "lobby", createdAt: serverTimestamp() },
          players: { [uid]: { name: profile.name, charFile: profile.charFile || "", side: 0, online: true, joinedAt: Date.now() } }
        };
      });
      if (res.committed && res.snapshot.exists()) {
        cur = { code, uid };
        setupPresence();
        return { code };
      }
    }
    return { error: "code" };
  } catch (e) {
    return { error: /permission/i.test(String(e && e.message)) ? "denied" : "net" };
  }
}

/* ── 部屋参加（2人目）。runTransaction は初回 null が来る点に注意 ── */
async function joinRoom(code, profile) {
  const uid = profile.uid;
  const rref = ref(db, roomPath(code));
  let err = null;
  try {
    const res = await runTransaction(rref, (room) => {
      if (room === null) return null; // キャッシュ未取得 → サーバー値で再実行
      err = null;
      if (!room.meta || room.meta.status !== "lobby") { err = "started"; return; }
      room.players = room.players || {};
      if (room.players[uid]) { room.players[uid].online = true; return room; } // 再参加
      if (Object.keys(room.players).length >= 2) { err = "full"; return; }
      room.players[uid] = { name: profile.name, charFile: profile.charFile || "", side: 1, online: true, joinedAt: Date.now() };
      return room;
    });
    if (err) return { error: err };
    if (!res.committed) return { error: "net" };
    if (!res.snapshot.exists()) return { error: "nofound" };
    const room = res.snapshot.val() || {};
    if (!room.players || !room.players[uid]) return { error: "net" };
    cur = { code, uid };
    setupPresence();
    return { ok: true };
  } catch (e) {
    return { error: /permission/i.test(String(e && e.message)) ? "denied" : "net" };
  }
}

function setupPresence() {
  if (!cur) return;
  try {
    const meRef = ref(db, roomPath(cur.code) + "/players/" + cur.uid + "/online");
    set(meRef, true);
    onDisconnect(meRef).set(false);
  } catch (e) {}
}

function watchConnected(cb) {
  connRef = ref(db, ".info/connected");
  onValue(connRef, (snap) => cb(!!snap.val()));
}
function watchRoom(cb) {
  if (!cur) return;
  roomRef = ref(db, roomPath(cur.code));
  onValue(roomRef, (snap) => cb(snap.val()));
}
function watchState(cb) {
  if (!cur) return;
  stateRef = ref(db, roomPath(cur.code) + "/state");
  onValue(stateRef, (snap) => cb(snap.val()));
}
/* ホストだけが購読：両者の picks が揃ったら判定する */
function watchPicks(cb) {
  if (!cur) return;
  picksRef = ref(db, roomPath(cur.code) + "/picks");
  onValue(picksRef, (snap) => cb(snap.val()));
}

/* ── ホストがゲーム開始 ── */
async function startGame(initialState) {
  if (!cur) return { error: "no" };
  await update(ref(db, roomPath(cur.code)), { state: initialState, picks: null, "meta/status": "playing" });
  return { ok: true };
}

/* ── 自分の選択を提出（役割 "def"|"off"） ── */
function submitPick(seq, role, pick) {
  if (!cur) return Promise.resolve();
  return set(ref(db, roomPath(cur.code) + "/picks/" + seq + "/" + role), pick);
}

/* ── ホストが判定結果＋新状態を配信（古い picks は削除） ── */
function pushState(state, clearSeq) {
  if (!cur) return Promise.resolve();
  const upd = { state };
  if (clearSeq != null) upd["picks/" + clearSeq] = null;
  return update(ref(db, roomPath(cur.code)), upd);
}

/* ── 中断（ホスト）：status=aborted を全員が受け取る ── */
function abort() {
  if (!cur) return Promise.resolve();
  return update(ref(db, roomPath(cur.code) + "/meta"), { status: "aborted" });
}

/* ── 退出（ロビーでホストなら部屋ごと削除） ── */
async function leaveRoom() {
  if (!cur) return;
  const code = cur.code, uid = cur.uid;
  detach();
  try {
    const metaSnap = await get(ref(db, roomPath(code) + "/meta"));
    const meta = metaSnap.val();
    if (meta && meta.host === uid && meta.status !== "playing") {
      await set(ref(db, roomPath(code)), null);
    } else {
      await set(ref(db, roomPath(code) + "/players/" + uid), null);
    }
  } catch (e) {}
  cur = null;
}
function detach() {
  try { if (roomRef) off(roomRef); } catch (e) {}
  try { if (stateRef) off(stateRef); } catch (e) {}
  try { if (picksRef) off(picksRef); } catch (e) {}
  try { if (connRef) off(connRef); } catch (e) {}
  roomRef = stateRef = picksRef = connRef = null;
}

/* ── ホストが賞金を1回だけ配布。winnerUid=null は引き分け ── */
async function awardOnce(players, winnerUid) {
  if (!cur) return [];
  const flagRef = ref(db, roomPath(cur.code) + "/rewarded");
  const res = await runTransaction(flagRef, (v) => (v ? undefined : true));
  if (!res.committed) return [];
  const FB = window.XEVARIONFB;
  if (!FB || !FB.awardXeva) return [];
  const out = [], jobs = [];
  players.forEach((p) => {
    if (!p || !p.uid) return;
    const amt = winnerUid == null ? PRIZE_DRAW : (p.uid === winnerUid ? PRIZE_WIN : PRIZE_LOSE);
    const label = winnerUid == null ? "引き分け" : (p.uid === winnerUid ? "勝利" : "敢闘");
    jobs.push(FB.awardXeva(p.uid, amt, label + " 賞金（MagiDiamondオンライン）"));
    out.push({ name: p.name, amount: amt, label });
  });
  await Promise.all(jobs);
  return out;
}

function isHostOf(room) { return !!(room && room.meta && cur && room.meta.host === cur.uid); }
function myUid() { return cur ? cur.uid : null; }
function code() { return cur ? cur.code : null; }
function inRoom() { return !!cur; }

window.MDOnline = {
  ready: true, PRIZE_WIN, PRIZE_LOSE, PRIZE_DRAW,
  createRoom, joinRoom, leaveRoom, watchRoom, watchState, watchPicks, watchConnected,
  startGame, submitPick, pushState, abort, awardOnce,
  isHostOf, myUid, code, inRoom
};
try { window.dispatchEvent(new Event("mdonline:ready")); } catch (e) {}
