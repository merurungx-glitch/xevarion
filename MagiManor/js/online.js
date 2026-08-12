/* ============================================================
   MagiManor ONLINE — 共鳴探索モード
   ・部屋番号(4桁)でつながる協力探索。世界のフラグ(扉/謎解き)を全員で共有し、
     他プレイヤーは同じ部屋にいると半透明の「残響」として見える。
   ・DBは XEVARION オンライン用 Firebase（xevarion-online）RTDB を利用（キーは "M"+4桁 で
     MagiChainParty の部屋(純4桁)と衝突しない）。
   window.ManorOnline として公開。
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getDatabase, ref, set, update, get, onValue, off,
  runTransaction, onDisconnect, remove, push, onChildAdded,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAivkOwjWlmqJSNmnSjOs4-PUAcVFOfbiY",
  authDomain: "xevarion-online.firebaseapp.com",
  databaseURL: "https://xevarion-online-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "xevarion-online",
  storageBucket: "xevarion-online.firebasestorage.app",
  messagingSenderId: "513584168485",
  appId: "1:513584168485:web:d2a009325df677b746c9cc",
  measurementId: "G-28C5G2BFR5",
};
const app = initializeApp(firebaseConfig, "manor-online");
const db = getDatabase(app);

const MAX_PLAYERS = 4;
let cur = null; // { code, uid, name, host }
let refs = [];  // 購読解除用 [ref, cb, evType]
let lastPos = "", lastSend = 0, joinedAt = 0;

const roomPath = (code) => "rooms/M" + code;
const gen4 = () => String(Math.floor(1000 + Math.random() * 9000));

async function create(profile, diff) {
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = gen4();
      const rref = ref(db, roomPath(code));
      let made = false;
      const res = await runTransaction(rref, (room) => {
        if (room) return; // 使用中 → 次の候補へ
        made = true;
        return {
          meta: { host: profile.uid, diff: diff || "normal", status: "lobby", created: Date.now() },
          players: { [profile.uid]: playerNode(profile) },
        };
      });
      if (res.committed && made) {
        cur = { code, uid: profile.uid, name: profile.name, host: true };
        afterEnter(code, profile.uid);
        return { code };
      }
    }
    return { error: "busy" };
  } catch (e) {
    return { error: /permission/i.test(String(e)) ? "denied" : "fail" };
  }
}

async function join(code, profile) {
  try {
    const rref = ref(db, roomPath(code));
    let err = null;
    const res = await runTransaction(rref, (room) => {
      if (room === null) return null; // 初回ローカルキャッシュ無し → サーバー値で再実行
      if (!room || !room.meta) { err = "nofound"; return; }
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
    cur = { code, uid: profile.uid, name: profile.name, host: snap.val().meta.host === profile.uid };
    afterEnter(code, profile.uid);
    return { ok: true };
  } catch (e) {
    return { error: /permission/i.test(String(e)) ? "denied" : "fail" };
  }
}

function playerNode(p) {
  return { name: p.name || "?", charFile: p.charFile || "", map: "hall", x: 10, y: 10, dir: "down", online: true, joined: Date.now() };
}
function afterEnter(code, uid) {
  joinedAt = Date.now();
  try { onDisconnect(ref(db, roomPath(code) + "/players/" + uid + "/online")).set(false); } catch (e) {}
}

function watch(cbs) {
  unwatchAll();
  if (!cur) return;
  const base = roomPath(cur.code);
  if (cbs.onRoom) {
    const r = ref(db, base);
    const cb = onValue(r, (s) => cbs.onRoom(s.val()));
    refs.push([r, cb]);
  }
  if (cbs.onFlags) {
    const r = ref(db, base + "/flags");
    const cb = onValue(r, (s) => cbs.onFlags(s.val() || {}));
    refs.push([r, cb]);
  }
  if (cbs.onPlayers) {
    const r = ref(db, base + "/players");
    const cb = onValue(r, (s) => cbs.onPlayers(s.val() || {}));
    refs.push([r, cb]);
  }
  if (cbs.onEvent) {
    const r = ref(db, base + "/events");
    const cb = onChildAdded(r, (s) => {
      const v = s.val();
      if (v && v.t >= joinedAt - 3000) cbs.onEvent(v);
    });
    refs.push([r, cb]);
  }
}
function unwatchAll() {
  for (const [r] of refs) { try { off(r); } catch (e) {} }
  refs = [];
}

function start() {
  if (!cur || !cur.host) return;
  update(ref(db, roomPath(cur.code) + "/meta"), { status: "playing", started: Date.now() }).catch(() => {});
}

function setFlag(flag) {
  if (!cur) return;
  set(ref(db, roomPath(cur.code) + "/flags/" + String(flag).replace(/[.#$/\[\]]/g, "_")), true).catch(() => {});
}

function sendEvent(type, payload) {
  if (!cur) return;
  push(ref(db, roomPath(cur.code) + "/events"), {
    type, payload: payload || {}, uid: cur.uid, name: cur.name || "?", t: Date.now(),
  }).catch(() => {});
}

function tick(S) {
  if (!cur || !S) return;
  const now = Date.now();
  const sig = S.map + "," + S.x + "," + S.y + "," + S.dir;
  if (sig === lastPos || now - lastSend < 200) return;
  lastPos = sig; lastSend = now;
  update(ref(db, roomPath(cur.code) + "/players/" + cur.uid), {
    map: S.map, x: S.x, y: S.y, dir: S.dir, online: true,
  }).catch(() => {});
}

async function leave() {
  if (!cur) return;
  const { code, uid, host } = cur;
  unwatchAll();
  cur = null; lastPos = "";
  try {
    const snap = await get(ref(db, roomPath(code)));
    const room = snap.val();
    if (room && host && room.meta && room.meta.status === "lobby") {
      await remove(ref(db, roomPath(code))); // ロビーのままホストが退出 → 部屋ごと削除
    } else {
      await remove(ref(db, roomPath(code) + "/players/" + uid));
      const s2 = await get(ref(db, roomPath(code) + "/players"));
      if (!s2.exists()) await remove(ref(db, roomPath(code))); // 誰もいなくなったら掃除
    }
  } catch (e) {}
}

window.addEventListener("beforeunload", () => { if (cur) { try { leave(); } catch (e) {} } });

window.ManorOnline = {
  create, join, watch, start, leave, setFlag, sendEvent, tick,
  isHost: () => !!(cur && cur.host),
  myUid: () => (cur ? cur.uid : null),
  code: () => (cur ? cur.code : null),
};
window.dispatchEvent(new Event("manoronline:ready"));
