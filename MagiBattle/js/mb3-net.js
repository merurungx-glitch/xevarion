/* ============================================================
   MagiBattle 3.0 — mb3-net.js（アリーナ・迎撃戦の記録＝Firebase xevarion-online）
   ・アリーナ：mbtArena/{シーズン YYYY-MM}/{uid} ＝ 防衛編成（名前・アイコン・ポイント・5人の育成のまとめ）
               mbtArenaLog/{守った人の uid}/{push} ＝ 攻められた記録（守った人がアリーナを開いたときに読む・自分のポイントに反映）
   ・迎撃戦：scoreattack/{YYYY-MM}/{uid} ＝ その月のいちばん大きいダメージ（MagiRanking の MagiBattle の欄も同じ場所を読む）
   ★ firebase-rules/xevarion-online.rules.json に mbtArena・mbtArenaLog・scoreattack を足した。<b>コンソールに貼って公開するまでは</b>
     書きこみが失敗する → アリーナは NPC だけ・迎撃戦は手元の記録だけで動く（エラーにはしない）。
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase, ref, get, set, push, runTransaction, remove } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

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
try { db = getDatabase(initializeApp(firebaseConfig, "magibattle3")); } catch (e) { db = null; }

function acct() {
  try { const a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null") || {}; return { uid: a.xvUid || "", name: a.name || "指揮官", charFile: a.charFile || "" }; } catch (e) { return { uid: "", name: "指揮官", charFile: "" }; }
}
function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms || 7000))]); }
function ym(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
function prevYm() { const d = new Date(); return ym(new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
const online = () => navigator.onLine !== false && !!db;

/* ── アリーナ ── */
async function submitDefense(season, entry) {
  const a = acct(); if (!a.uid || !online()) return { error: "offline" };
  try {
    await withTimeout(set(ref(db, "mbtArena/" + season + "/" + a.uid), Object.assign({ name: String(a.name).slice(0, 24), charFile: a.charFile, at: Date.now() }, entry)));
    return { ok: true };
  } catch (e) { return { error: String(e && e.message || e) }; }
}
async function listArena(season) {
  if (!online()) return null;
  try {
    const snap = await withTimeout(get(ref(db, "mbtArena/" + season)));
    const out = [];
    snap.forEach((c) => { const v = c.val() || {}; if (v && Array.isArray(v.team) && v.team.length) out.push(Object.assign({ uid: c.key }, v)); });
    return out;
  } catch (e) { return null; }
}
async function pushLog(defUid, log) {
  if (!defUid || !online()) return { error: "offline" };
  try { await withTimeout(push(ref(db, "mbtArenaLog/" + defUid), Object.assign({ at: Date.now() }, log))); return { ok: true }; } catch (e) { return { error: "net" }; }
}
async function readLogs() {
  const a = acct(); if (!a.uid || !online()) return null;
  try {
    const snap = await withTimeout(get(ref(db, "mbtArenaLog/" + a.uid)));
    const out = []; snap.forEach((c) => { out.push(Object.assign({ id: c.key }, c.val() || {})); });
    out.sort((x, y) => (y.at || 0) - (x.at || 0));
    /* 古い記録（30日より前）は消す */
    const old = out.filter((x) => Date.now() - (x.at || 0) > 30 * 86400000);
    old.forEach((x) => { try { remove(ref(db, "mbtArenaLog/" + a.uid + "/" + x.id)); } catch (e) {} });
    return out.filter((x) => Date.now() - (x.at || 0) <= 30 * 86400000);
  } catch (e) { return null; }
}

/* ── 迎撃戦（その月のいちばん大きいダメージだけ残す）── */
async function submitScore(score) {
  const a = acct(); score = Math.round(score || 0);
  if (!a.uid || score <= 0 || !online()) return { error: "offline" };
  try {
    await withTimeout(runTransaction(ref(db, "scoreattack/" + ym() + "/" + a.uid), (cur) => {
      if (cur && (cur.score || 0) >= score) return cur;
      return Object.assign({}, cur || {}, { name: String(a.name).slice(0, 24), charFile: a.charFile, score, ts: Date.now() });
    }));
    return { ok: true };
  } catch (e) { return { error: "net" }; }
}
async function getRanking(m) {
  if (!online()) return null;
  try {
    const snap = await withTimeout(get(ref(db, "scoreattack/" + (m || ym()))));
    const rows = []; snap.forEach((c) => { const v = c.val() || {}; rows.push({ uid: c.key, name: v.name || "?", charFile: v.charFile || "", score: v.score || 0, claimed: !!v.claimed }); });
    rows.sort((x, y) => y.score - x.score);
    return rows;
  } catch (e) { return null; }
}
/* 先月の順位のごほうび。受け取りの印はクラウドに付ける（二重に受け取らない）
   ★★ 2026-10-31 ご指定「報酬は XEVA ではなくジェムに」→ 1位 💎60／2位 💎40／3位 💎25／4〜10位 💎15（XEVARION 共通のジェム） */
const RANK_RW = [60, 40, 25, 15, 15, 15, 15, 15, 15, 15];
async function claimPrevReward() {
  const a = acct(); if (!a.uid || !online()) return { ok: false };
  const p = prevYm();
  const rows = await getRanking(p); if (!rows) return { ok: false };
  const i = rows.findIndex((r) => r.uid === a.uid);
  if (i < 0 || i >= RANK_RW.length || rows[i].claimed) return { ok: false, rank: i + 1 };
  let got = false;
  try {
    await withTimeout(runTransaction(ref(db, "scoreattack/" + p + "/" + a.uid + "/claimed"), (cur) => { if (cur) return; got = true; return true; }));
  } catch (e) { return { ok: false }; }
  if (!got) return { ok: false };
  try { window.XEVA && XEVA.gem && XEVA.gem.add(RANK_RW[i], "MagiBattle：迎撃戦 " + p + " の " + (i + 1) + "位"); } catch (e) {}
  return { ok: true, rank: i + 1, amount: RANK_RW[i], ym: p };
}

window.MB3NET = { acct, submitDefense, listArena, pushLog, readLogs, submitScore, getRanking, claimPrevReward, ym, online, RANK_RW };
window.dispatchEvent(new Event("mb3net"));
