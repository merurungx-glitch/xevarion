/* ============================================================
   MagiQuiz — quiz-net.js（2台で対戦の通信・Firebase xevarion-online）
   ★★ 2026-11-08 ご指定「以前の提案の 5 の2台での対戦を追加」
   ・部屋は rooms/Q<4桁>（MagiChainParty＝4桁・MagiManor＝M・MagiJackpot＝J と同じ rooms の下。Q で始めて重ならないように）。
     ★ firebase-rules/xevarion-online.rules.json の rooms/$code は読み書きが開いていて、meta（host・status）と players/$uid（name≦12・slot 0〜5 …）
       だけ形を確かめている。state・acts は自由。<b>ルールの貼り直しは要らない</b>。
   ・サーバーの時刻（.info/serverTimeOffset）で、問題の始まりと残り時間を全員でそろえる。
   ・画面と試合の進め方は quiz-online.js。ここは通信だけ（window.MQNet）。
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase, ref, get, set, update, remove, onValue, runTransaction, onDisconnect } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

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
let db = null;
try { db = getDatabase(initializeApp(firebaseConfig, "magiquiz")); } catch (e) { db = null; }

let ofs = 0, conn = false;
if (db) {
  try { onValue(ref(db, ".info/serverTimeOffset"), (s) => { ofs = Number(s.val()) || 0; }); } catch (e) {}
  try { onValue(ref(db, ".info/connected"), (s) => { conn = !!s.val(); try { window.dispatchEvent(new CustomEvent("mqnet:conn", { detail: { on: conn } })); } catch (e) {} }); } catch (e) {}
}
const T = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms || 8000))]);

window.MQNet = {
  ok: () => !!db,
  connected: () => conn,
  now: () => Date.now() + ofs,
  get: async (path) => { const s = await T(get(ref(db, path))); return s.val(); },
  set: (path, v) => T(set(ref(db, path), v)),
  update: (path, v) => T(update(ref(db, path), v)),
  remove: (path) => T(remove(ref(db, path))),
  tx: (path, fn) => T(runTransaction(ref(db, path), fn)),
  /* 見張る（戻り値を呼ぶとやめる） */
  watch: (path, cb) => onValue(ref(db, path), (s) => cb(s.val()), () => cb(undefined)),
  /* 通信が切れたら書く（タブを閉じた・電波が切れた） */
  onDrop: (path, v) => onDisconnect(ref(db, path)).update(v),
  onDropCancel: (path) => onDisconnect(ref(db, path)).cancel(),
};
try { window.dispatchEvent(new Event("mqnet:ready")); } catch (e) {}
