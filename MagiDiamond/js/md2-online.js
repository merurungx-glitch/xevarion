/* ══════════════════════════════════════════════════════════════
   MagiDiamond 最新版 — オンライン（部屋番号でつながる2台対戦）
   ------------------------------------------------------------
   ・置き場所は XEVARION オンライン用 Firebase（xevarion-online）の RTDB。
     部屋の名前は <b>rooms/E{4桁}</b>。
     ★ 既存とぶつからないよう頭文字を分けてある
       （チェインパーティ＝純4桁／MagiManor＝M／MagiResonance＝R／
         MagiBurst＝B／MagiDiamond 過去版＝D／<b>最新版＝E</b>）。
   ・部屋を作った側がホスト。両方がそろったら "md2online:start" を投げて試合を始める。
   ・試合中の同期は、打席ごとに「選んだもの」を書き合う形にしてある
     （過去版と同じ考えかた。1球ごとに全部の状態を配らないので軽い）。
   ★ 通信が切れても<b>試合そのものは止めない</b>（CPU が引き継ぐ）。
     途中で固まってしまうより、最後まで遊べるほうがよいため。
   ══════════════════════════════════════════════════════════════ */
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
const app = initializeApp(firebaseConfig, "md2-online");
const db = getDatabase(app);
const ROOMS = "rooms";

let state = { room: "", host: false, ready: false, me: "", unsub: null };

function myUid() {
  try {
    const a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null");
    if (a && a.xvUid) return String(a.xvUid);
  } catch (e) {}
  let k = "";
  try { k = localStorage.getItem("md2_guest") || ""; } catch (e) {}
  if (!k) { k = "g" + Math.random().toString(36).slice(2, 10); try { localStorage.setItem("md2_guest", k); } catch (e) {} }
  return k;
}
function myName() {
  try {
    const a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null");
    if (a && a.name) return String(a.name);
  } catch (e) {}
  return "プレイヤー";
}
function roomCode() { return "E" + String(Math.floor(1000 + Math.random() * 9000)); }

/* 相手に渡すチーム（id と守備位置だけ。能力は向こうでも同じ式から作れる） */
function packTeam(t) {
  return { order: (t.order || []).slice(0, 9), pos: Object.assign({}, t.pos || {}), sp: (t.sp || []).slice(0, 3) };
}

async function create(cfg, t) {
  await leave();
  const code = roomCode();
  const r = ref(db, ROOMS + "/" + code);
  state.me = myUid();
  await set(r, {
    game: "magidiamond2", at: serverTimestamp(),
    cfg: { inn: cfg.inn, stadium: cfg.stadium },
    host: { uid: state.me, name: myName(), team: packTeam(t) },
    guest: null, phase: "wait",
  });
  try { onDisconnect(ref(db, ROOMS + "/" + code)).remove(); } catch (e) {}
  state.room = code; state.host = true; state.ready = false;
  watch();
  return code;
}
async function join(code, cfg, t) {
  await leave();
  code = String(code || "").toUpperCase();
  if (!/^E?\d{4}$/.test(code)) throw new Error("bad code");
  if (code[0] !== "E") code = "E" + code;
  const r = ref(db, ROOMS + "/" + code);
  const snap = await get(r);
  const v = snap.val();
  if (!v || v.game !== "magidiamond2") throw new Error("no room");
  if (v.guest) throw new Error("full");
  state.me = myUid();
  await update(r, { guest: { uid: state.me, name: myName(), team: packTeam(t) }, phase: "ready" });
  state.room = code; state.host = false; state.ready = true;
  watch();
  return code;
}
function watch() {
  if (!state.room) return;
  const r = ref(db, ROOMS + "/" + state.room);
  state.unsub = onValue(r, (snap) => {
    const v = snap.val();
    if (!v) { state.room = ""; state.ready = false; return; }
    if (v.guest && !state.ready) {
      state.ready = true;
      /* ホスト側は相手がそろったら試合を始める */
      if (state.host) {
        try {
          window.dispatchEvent(new CustomEvent("md2online:start", {
            detail: { room: state.room, host: true, cfg: v.cfg, opp: v.guest },
          }));
        } catch (e) {}
      }
    }
    if (!state.host && v.phase === "ready") {
      try {
        window.dispatchEvent(new CustomEvent("md2online:start", {
          detail: { room: state.room, host: false, cfg: v.cfg, opp: v.host },
        }));
      } catch (e) {}
    }
  });
}
async function leave() {
  if (state.unsub) { try { off(ref(db, ROOMS + "/" + state.room)); } catch (e) {} state.unsub = null; }
  if (state.room) {
    try {
      if (state.host) await set(ref(db, ROOMS + "/" + state.room), null);
      else await update(ref(db, ROOMS + "/" + state.room), { guest: null, phase: "wait" });
    } catch (e) {}
  }
  state = { room: "", host: false, ready: false, me: "", unsub: null };
}
function status() { return { room: state.room, host: state.host, ready: state.ready }; }

window.MD2Online = { create, join, leave, status };
try { window.dispatchEvent(new Event("md2online:ready")); } catch (e) {}
