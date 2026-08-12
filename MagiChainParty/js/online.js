/* ============================================================
   MagiChainParty ONLINE — 部屋番号でつながるオンライン対戦
   ・ゲーム状態は magichainparty Firebase Realtime Database に保存
   ・報酬は XEVARION(xevarion-fb.js)の awardXeva で各アカウントへ配信
   ・「いま手番のプレイヤーの端末」が連鎖を計算して盤面をFBへ書き込み、
     他の端末はそれを受信して再描画する（手番制なので競合しない）
   window.MCPOnline として公開。読み込み完了で "mcponline:ready" を発火。
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
const app = initializeApp(firebaseConfig, "mcp-online");
const db = getDatabase(app);

const ROOMS = "rooms";
const MAX_PLAYERS = 6;
/* オンライン対戦の順位賞金（XEVA・ポータルで受取）。ローカルより高め。 */
const ONLINE_PRIZES = [300, 200, 150, 100, 50, 25];

let cur = null;      // { code, uid } 参加中の部屋
let roomCb = null, stateCb = null;
let roomRef = null, stateRef = null;

function roomPath(code) { return ROOMS + "/" + code; }
function gen4() { return String(Math.floor(1000 + Math.random() * 9000)); }

/* ── 空いている4桁コードを探して部屋を作成（ホスト＝slot0） ── */
async function createRoom(profile, opts) {
  const uid = profile.uid;
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = gen4();
      const rref = ref(db, roomPath(code));
      const res = await runTransaction(rref, (room) => {
        if (room) return; // 既に使われている → 中断（次のコードを試す）
        return {
          meta: {
            host: uid, size: opts.size || 8, roundLimit: opts.roundLimit || 0,
            status: "lobby", createdAt: serverTimestamp()
          },
          players: {
            [uid]: { name: profile.name, charFile: profile.charFile || "", slot: 0, ready: true, online: true, joinedAt: Date.now() }
          }
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
    // permission denied（DBルール未設定）や通信断
    return { error: /permission/i.test(String(e && e.message)) ? "denied" : "net" };
  }
}

/* ── 既存の部屋に参加（4桁コード＋自分のアカウント） ──
   注意: runTransaction は初回ローカルキャッシュ無しで room=null が来る。
   ここで undefined を返すと即中断でサーバー値の再実行が行われないため、
   null のときは null を返して「サーバー値での再実行」を促す。 */
async function joinRoom(code, profile) {
  const uid = profile.uid;
  const rref = ref(db, roomPath(code));
  let err = null;
  try {
    const res = await runTransaction(rref, (room) => {
      if (room === null) return null; // キャッシュ未取得 → サーバー値で再実行（実在しなければ null commit = 何も起きない）
      err = null;
      if (!room.meta || room.meta.status !== "lobby") { err = "started"; return; }
      room.players = room.players || {};
      if (room.players[uid]) { room.players[uid].ready = true; room.players[uid].online = true; return room; } // 再参加
      const n = Object.keys(room.players).length;
      if (n >= MAX_PLAYERS) { err = "full"; return; }
      // 空きスロットを探す
      const used = new Set(Object.values(room.players).map((p) => p.slot));
      let slot = 0; while (used.has(slot)) slot++;
      room.players[uid] = { name: profile.name, charFile: profile.charFile || "", slot, ready: false, online: true, joinedAt: Date.now() };
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

/* ── 切断時に自分をロビーから外す（プレイ中は残す＝再接続で復帰） ── */
function setupPresence() {
  if (!cur) return;
  try {
    const meRef = ref(db, roomPath(cur.code) + "/players/" + cur.uid + "/online");
    set(meRef, true);
    onDisconnect(meRef).set(false);
  } catch (e) {}
}

/* ── 自分の接続状態を購読（true=接続中 / false=切断。切断表示に使用） ── */
let connRef = null;
function watchConnected(cb) {
  connRef = ref(db, ".info/connected");
  onValue(connRef, (snap) => cb(!!snap.val()));
}

/* ── 部屋(meta+players)の変化を購読 ── */
function watchRoom(cb) {
  if (!cur) return;
  roomCb = cb;
  roomRef = ref(db, roomPath(cur.code));
  onValue(roomRef, (snap) => { if (roomCb) roomCb(snap.val()); });
}
/* ── ゲーム状態の変化を購読 ── */
function watchState(cb) {
  if (!cur) return;
  stateCb = cb;
  stateRef = ref(db, roomPath(cur.code) + "/state");
  onValue(stateRef, (snap) => { if (stateCb) stateCb(snap.val()); });
}

function setReady(ready) {
  if (!cur) return Promise.resolve();
  return set(ref(db, roomPath(cur.code) + "/players/" + cur.uid + "/ready"), !!ready);
}
function setOptions(opts) {
  if (!cur) return Promise.resolve();
  const upd = {};
  if (opts.size != null) upd.size = opts.size;
  if (opts.roundLimit != null) upd.roundLimit = opts.roundLimit;
  return update(ref(db, roomPath(cur.code) + "/meta"), upd);
}

/* ── ホストがゲーム開始：スロット確定＋初期状態を書き込み、status=playing ──
     slotUpdates = { uid: slotIndex, ... }（プレイヤーのスロット番号を 0..n-1 に確定） */
async function startGame(initialState, slotUpdates) {
  if (!cur) return { error: "no" };
  const upd = { state: initialState, "meta/status": "playing" };
  if (slotUpdates) {
    for (const uid in slotUpdates) upd["players/" + uid + "/slot"] = slotUpdates[uid];
  }
  await update(ref(db, roomPath(cur.code)), upd);
  return { ok: true };
}

/* ── 手番プレイヤーが確定した新しい盤面を書き込み ── */
function pushState(state) {
  if (!cur) return Promise.resolve();
  return set(ref(db, roomPath(cur.code) + "/state"), state);
}

/* ── 部屋から退出（ロビーなら自分を削除、ホストなら部屋ごと削除） ── */
async function leaveRoom() {
  if (!cur) return;
  const code = cur.code, uid = cur.uid;
  detach();
  try {
    const metaSnap = await get(ref(db, roomPath(code) + "/meta"));
    const meta = metaSnap.val();
    if (meta && meta.host === uid && meta.status !== "playing") {
      await set(ref(db, roomPath(code)), null); // ホストがロビー解散
    } else {
      await set(ref(db, roomPath(code) + "/players/" + uid), null);
    }
  } catch (e) {}
  cur = null;
}
function detach() {
  try { if (roomRef) off(roomRef); } catch (e) {}
  try { if (stateRef) off(stateRef); } catch (e) {}
  try { if (connRef) off(connRef); } catch (e) {}
  roomRef = stateRef = connRef = null; roomCb = stateCb = null;
}

/* ── ホストが順位賞金を1回だけ配布（rewarded フラグで二重防止） ──
     ranked = 順位順の {uid,name} 配列。戻り値 [{rank,name,amount}] ── */
async function awardOnce(ranked) {
  if (!cur) return [];
  const flagRef = ref(db, roomPath(cur.code) + "/rewarded");
  const res = await runTransaction(flagRef, (v) => (v ? undefined : true)); // 既にtrueなら中断
  if (!res.committed) return [];
  const FB = window.XEVARIONFB;
  if (!FB || !FB.awardXeva) return [];
  const out = [], jobs = [];
  ranked.slice(0, MAX_PLAYERS).forEach((r, i) => {
    const amt = ONLINE_PRIZES[i]; if (!amt || !r || !r.uid) return;
    jobs.push(FB.awardXeva(r.uid, amt, (i + 1) + "位 賞金（MagiChainPartyオンライン）"));
    out.push({ rank: i + 1, name: r.name, amount: amt });
  });
  await Promise.all(jobs);
  return out;
}

function isHost(room) { return !!(room && room.meta && cur && room.meta.host === cur.uid); }
function myUid() { return cur ? cur.uid : null; }
function code() { return cur ? cur.code : null; }
function inRoom() { return !!cur; }

window.MCPOnline = {
  ready: true, MAX_PLAYERS, ONLINE_PRIZES,
  createRoom, joinRoom, leaveRoom, watchRoom, watchState, watchConnected,
  setReady, setOptions, startGame, pushState, awardOnce,
  isHost, myUid, code, inRoom
};
try { window.dispatchEvent(new Event("mcponline:ready")); } catch (e) {}
