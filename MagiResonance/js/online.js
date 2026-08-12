/* ============================================================
   MagiResonance ONLINE
   ・部屋番号(4桁)のリアルタイム対戦: ホストがバトルを計算し
     スナップショットを配信、ゲストは観戦描画（手番制と同じく競合しない）
   ・非同期アリーナ: 防衛パーティを magires/defense に公開し、
     他プレイヤーのゴーストと対戦
   ・スコアアタック: magires/score/{月キー} にベストスコアを登録
   ・ワールドボス: magires/worldboss/{週キー} に全員の与ダメを合算
   ・DBは XEVARION オンライン用 Firebase（xevarion-online）RTDB を利用（部屋キーは "R"+4桁 で
     MagiChainParty(純4桁)/MagiManor("M"+4桁) と衝突しない）
   window.ResOnline として公開。
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getDatabase, ref, set, update, get, onValue, off,
  runTransaction, onDisconnect, remove, push,
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
const app = initializeApp(firebaseConfig, "res-online");
const db = getDatabase(app);

const roomPath = (code) => "rooms/R" + code;
const gen4 = () => String(Math.floor(1000 + Math.random() * 9000));
function monthKey() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
function weekKey() {
  const d = new Date(); const onejan = new Date(d.getFullYear(), 0, 1);
  const wk = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return d.getFullYear() + "-w" + wk;
}

let cur = null; // { code, uid, host }
let refs = [];

/* ══════════ 部屋制リアルタイム対戦 ══════════ */
async function create(profile) {
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = gen4();
      const rref = ref(db, roomPath(code));
      let made = false;
      const res = await runTransaction(rref, (room) => {
        if (room) return;
        made = true;
        return {
          meta: { host: profile.uid, status: "lobby", created: Date.now() },
          players: { [profile.uid]: playerNode(profile) },
        };
      });
      if (res.committed && made) {
        cur = { code, uid: profile.uid, host: true };
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
      if (room === null) return null; // キャッシュ未取得 → サーバー値で再実行
      if (!room || !room.meta) { err = "nofound"; return; }
      err = null;
      const ps = room.players || {};
      if (!ps[profile.uid]) {
        if (room.meta.status !== "lobby") { err = "started"; return; }
        if (Object.keys(ps).length >= 2) { err = "full"; return; }
      }
      room.players = ps;
      room.players[profile.uid] = playerNode(profile);
      return room;
    });
    if (err) return { error: err };
    const snap = await get(rref);
    if (!snap.exists()) return { error: "nofound" };
    if (!res.committed) return { error: "fail" };
    cur = { code, uid: profile.uid, host: snap.val().meta.host === profile.uid };
    afterEnter(code, profile.uid);
    return { ok: true };
  } catch (e) {
    return { error: /permission/i.test(String(e)) ? "denied" : "fail" };
  }
}

function playerNode(p) {
  return { name: p.name || "?", charFile: p.charFile || "", party: p.party || null, power: p.power || 0, online: true, joined: Date.now() };
}
function afterEnter(code, uid) {
  try { onDisconnect(ref(db, roomPath(code) + "/players/" + uid + "/online")).set(false); } catch (e) {}
}

function watch(cbs) {
  unwatchAll();
  if (!cur) return;
  const base = roomPath(cur.code);
  if (cbs.onRoom) {
    const r = ref(db, base);
    onValue(r, (s) => cbs.onRoom(s.val()));
    refs.push(r);
  }
  if (cbs.onSnap) {
    const r = ref(db, base + "/snap");
    onValue(r, (s) => { const v = s.val(); if (v) cbs.onSnap(v); });
    refs.push(r);
  }
}
function unwatchAll() { for (const r of refs) { try { off(r); } catch (e) {} } refs = []; }

/* 自分のパーティ(戦闘用ユニット定義の配列)を部屋に公開 */
function setParty(party, power) {
  if (!cur) return Promise.resolve();
  return update(ref(db, roomPath(cur.code) + "/players/" + cur.uid), { party, power }).catch(() => {});
}
/* ホストが開始 */
function startMatch() {
  if (!cur || !cur.host) return;
  return update(ref(db, roomPath(cur.code) + "/meta"), { status: "playing", started: Date.now() }).catch(() => {});
}
/* ホストがスナップショット配信 */
function pushSnap(snap) {
  if (!cur || !cur.host) return;
  set(ref(db, roomPath(cur.code) + "/snap"), snap).catch(() => {});
}
/* ホストが結果確定＋賞金配布（勝者200/敗者60 XEVA・二重防止） */
async function reportResult(winnerUid, names) {
  if (!cur || !cur.host) return [];
  try {
    await update(ref(db, roomPath(cur.code) + "/meta"), { status: "done", winner: winnerUid });
    const flagRef = ref(db, roomPath(cur.code) + "/rewarded");
    const res = await runTransaction(flagRef, (v) => (v ? undefined : true));
    if (!res.committed) return [];
    const FB = window.XEVARIONFB;
    if (!FB || !FB.awardXeva) return [];
    const out = [];
    for (const uid in names) {
      const amt = uid === winnerUid ? 200 : 60;
      await FB.awardXeva(uid, amt, (uid === winnerUid ? "勝利" : "敢闘") + " 賞金（MagiResonanceオンライン対戦）");
      out.push({ uid, name: names[uid], amount: amt });
    }
    return out;
  } catch (e) { return []; }
}

async function leave() {
  if (!cur) return;
  const { code, uid, host } = cur;
  unwatchAll();
  cur = null;
  try {
    const snap = await get(ref(db, roomPath(code)));
    const room = snap.val();
    if (room && host) {
      await remove(ref(db, roomPath(code)));
    } else {
      await remove(ref(db, roomPath(code) + "/players/" + uid));
    }
  } catch (e) {}
}
window.addEventListener("beforeunload", () => { if (cur) { try { leave(); } catch (e) {} } });

/* ══════════ 非同期アリーナ（防衛ゴースト） ══════════ */
async function publishDefense(uid, data) {
  if (!uid) return;
  try { await set(ref(db, "magires/defense/" + uid), Object.assign({ t: Date.now() }, data)); } catch (e) {}
}
async function fetchDefenses(exceptUid) {
  try {
    const snap = await get(ref(db, "magires/defense"));
    const rows = [];
    snap.forEach((c) => { if (c.key !== exceptUid) rows.push(Object.assign({ uid: c.key }, c.val())); });
    return rows;
  } catch (e) { return []; }
}

/* ══════════ スコアアタック ランキング（月次） ══════════ */
async function submitScore(uid, name, charFile, score) {
  if (!uid || !score) return;
  try {
    await runTransaction(ref(db, "magires/score/" + monthKey() + "/" + uid), (cur2) => {
      if (cur2 && cur2.score >= score) return cur2;
      return { name, charFile: charFile || "", score, t: Date.now() };
    });
  } catch (e) {}
}
async function getScoreRanking() {
  try {
    const snap = await get(ref(db, "magires/score/" + monthKey()));
    const rows = [];
    snap.forEach((c) => rows.push(Object.assign({ uid: c.key }, c.val())));
    rows.sort((a, b) => b.score - a.score);
    return rows;
  } catch (e) { return []; }
}

/* ══════════ ワールドボス（週次・全員で削る） ══════════ */
const WB_MAX = 500000000; // 5億
async function contributeWorldBoss(uid, name, charFile, dmg) {
  if (!uid || !dmg) return { total: 0 };
  try {
    await runTransaction(ref(db, "magires/worldboss/" + weekKey() + "/players/" + uid), (cur2) => {
      cur2 = cur2 || { name, charFile: charFile || "", dmg: 0 };
      cur2.name = name; cur2.charFile = charFile || "";
      cur2.dmg = (cur2.dmg || 0) + dmg; cur2.t = Date.now();
      return cur2;
    });
    const res = await runTransaction(ref(db, "magires/worldboss/" + weekKey() + "/total"), (t) => (t || 0) + dmg);
    return { total: (res.snapshot && res.snapshot.val()) || 0 };
  } catch (e) { return { total: 0 }; }
}
async function getWorldBoss() {
  try {
    const snap = await get(ref(db, "magires/worldboss/" + weekKey()));
    const v = snap.val() || {};
    const rows = [];
    if (v.players) for (const uid in v.players) rows.push(Object.assign({ uid }, v.players[uid]));
    rows.sort((a, b) => b.dmg - a.dmg);
    return { total: v.total || 0, max: WB_MAX, rows, week: weekKey() };
  } catch (e) { return { total: 0, max: WB_MAX, rows: [], week: weekKey() }; }
}

window.ResOnline = {
  create, join, leave, watch, setParty, startMatch, pushSnap, reportResult,
  publishDefense, fetchDefenses, submitScore, getScoreRanking,
  contributeWorldBoss, getWorldBoss, WB_MAX,
  isHost: () => !!(cur && cur.host),
  code: () => (cur ? cur.code : null),
  inRoom: () => !!cur,
};
window.dispatchEvent(new Event("resonline:ready"));
