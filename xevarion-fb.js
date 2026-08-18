// ============================================================
// XEVARION-FB — XEVARION 専用 Firebase（xevarion-account）
//   役割（MagiLink の magilink-63067 とは分離）:
//     ・XEVARIONアカウントの登録（表示名の一意化・アイコン・4桁ゲームパスワード）
//     ・ゲーム内アカウント紐づけ（名前検索 → 4桁パスワード照合）
//     ・XEVA 賞金の配信（pending にプッシュ → 本人がポータルで受取）
//   ※ MagiLink のメッセージ等は従来どおり magilink-63067 のまま。
//   window.XEVARIONFB として公開。読み込み完了で "xevarionfb:ready" を発火。
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getDatabase, ref, set, update, get, push, remove, runTransaction,
  query, orderByChild, equalTo, serverTimestamp, onValue
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDjPuR88Szm3wpueov2Aj9755TguWjD7cM",
  authDomain: "xevarion-account.firebaseapp.com",
  databaseURL: "https://xevarion-account-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "xevarion-account",
  storageBucket: "xevarion-account.firebasestorage.app",
  messagingSenderId: "14241003829",
  appId: "1:14241003829:web:07492e55b9863301a9b47c",
  measurementId: "G-QP5DGNSS6F"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const NODE = "accounts";
const DB_URL = firebaseConfig.databaseURL;

/* ════════════ サーバー時刻（同期タイムスタンプの基準） ════════════
   store のマージは「タイムスタンプが新しい側が勝つ」方式なので、
   端末時計がずれていると、時計が進んでいる端末の古いデータが
   正しい新しいデータに勝ってしまう（＝進行が巻き戻る）。
   Firebase の .info/serverTimeOffset で端末時計とサーバーの差を測り、
   すべての書込時刻をサーバー基準にそろえる。 */
let SERVER_SKEW = 0;
try {
  onValue(ref(db, ".info/serverTimeOffset"), (s) => {
    const v = s.val();
    if (typeof v === "number" && Math.abs(v) < 86400000 * 3) SERVER_SKEW = v;
  });
} catch (e) {}
/* サーバー基準の現在時刻（ms）。オフラインでも端末時計にフォールバックする。 */
function now() { return Date.now() + SERVER_SKEW; }
function serverSkew() { return SERVER_SKEW; }

/* ── 4桁パスワードのハッシュ（casual PIN。SubtleCrypto SHA-256） ── */
async function hashPw(pw) {
  pw = String(pw == null ? "" : pw);
  try {
    const data = new TextEncoder().encode("xevarion-pin:" + pw);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    // フォールバック（非対応環境）
    let h = 0; for (let i = 0; i < pw.length; i++) { h = (h * 31 + pw.charCodeAt(i)) | 0; }
    return "f" + (h >>> 0).toString(16);
  }
}
function normName(n) { return String(n == null ? "" : n).trim(); }
function lowerName(n) { return normName(n).toLowerCase(); }

/* ── 月キー（YYYY-MM） ── */
function monthKey(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
function prevMonthKey(d) { d = d || new Date(); return monthKey(new Date(d.getFullYear(), d.getMonth() - 1, 1)); }

/* ── 表示名の一意チェック（exceptUid は自分を除外） ── */
async function isNameTaken(name, exceptUid) {
  const lower = lowerName(name);
  if (!lower) return false;
  try {
    const snap = await get(query(ref(db, NODE), orderByChild("nameLower"), equalTo(lower)));
    let taken = false;
    snap.forEach((c) => { if (c.key !== exceptUid) taken = true; });
    return taken;
  } catch (e) {
    try {
      const all = await get(ref(db, NODE));
      let taken = false;
      all.forEach((c) => { const u = c.val(); if (c.key !== exceptUid && u && lowerName(u.name) === lower) taken = true; });
      return taken;
    } catch (e2) { return false; }
  }
}

/* ── ID（表示名）でアカウントを検索（サインイン用）。完全一致を先頭、次に部分一致。
   戻り値 [{ uid, name, charFile }]（最大10件） ── */
async function searchAccounts(query) {
  const q = lowerName(query);
  if (!q) return [];
  try {
    const snap = await get(ref(db, NODE));
    const exact = [], partial = [];
    snap.forEach((c) => {
      const v = c.val() || {};
      const nl = lowerName(v.name);
      if (!nl) return;
      const row = { uid: c.key, name: v.name || "?", charFile: v.charFile || "" };
      if (nl === q) exact.push(row);
      else if (nl.indexOf(q) >= 0) partial.push(row);
    });
    return exact.concat(partial).slice(0, 10);
  } catch (e) { return []; }
}

/* ── 表示名から1件検索（ゲーム内紐づけ用） ── */
async function findByName(name) {
  const lower = lowerName(name);
  if (!lower) return null;
  try {
    const snap = await get(query(ref(db, NODE), orderByChild("nameLower"), equalTo(lower)));
    let hit = null;
    snap.forEach((c) => { if (!hit) hit = { uid: c.key, ...c.val() }; });
    return hit;
  } catch (e) {
    try {
      const all = await get(ref(db, NODE));
      let hit = null;
      all.forEach((c) => { const u = c.val(); if (!hit && u && lowerName(u.name) === lower) hit = { uid: c.key, ...u }; });
      return hit;
    } catch (e2) { return null; }
  }
}

/* ── 登録：新規アカウントを作成し uid を返す ──
   戻り値 { uid } 成功 / { error:'name' } 名前重複 / { error:... } その他 */
async function register(acc) {
  const name = normName(acc && acc.name);
  if (!name) return { error: "noname" };
  // 既存 xvUid があり実在すれば更新のみ
  if (acc.xvUid) {
    try { const s = await get(ref(db, NODE + "/" + acc.xvUid)); if (s.exists()) { await updateProfile(acc); return { uid: acc.xvUid }; } } catch (e) {}
  }
  if (await isNameTaken(name, acc.xvUid)) return { error: "name" };
  const node = push(ref(db, NODE));
  const uid = node.key;
  const data = {
    name, nameLower: lowerName(name),
    charFile: acc.charFile || "", charId: acc.charId || "",
    gamePwHash: acc.gamePwHash || "",
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  };
  try { await set(node, data); } catch (e) { return { error: "net" }; }
  return { uid };
}

/* ── プロフィール更新（名前・アイコン・4桁PW） ── */
async function updateProfile(acc) {
  if (!acc || !acc.xvUid) return { error: "nouid" };
  const upd = { updatedAt: serverTimestamp() };
  if (acc.name != null) { upd.name = normName(acc.name); upd.nameLower = lowerName(acc.name); }
  if (acc.charFile != null) upd.charFile = acc.charFile;
  if (acc.charId != null) upd.charId = acc.charId;
  if (acc.gamePwHash != null) upd.gamePwHash = acc.gamePwHash;
  try { await update(ref(db, NODE + "/" + acc.xvUid), upd); return { ok: true }; } catch (e) { return { error: "net" }; }
}

/* ── 4桁ゲームパスワード照合 ── */
async function verifyGamePw(uid, pwHash) {
  try {
    const s = await get(ref(db, NODE + "/" + uid + "/gamePwHash"));
    const stored = s.val();
    if (!stored) return false;
    return stored === pwHash;
  } catch (e) { return false; }
}

/* ── pending へ push（受取待ちの賞金） ── */
async function pushPending(uid, amount, reason) {
  const node = push(ref(db, NODE + "/" + uid + "/pending"));
  await set(node, { amount, reason: reason || "", ts: serverTimestamp() });
}

/* ── XEVA ゲーム賞金を配信。pending へ push ＋ 月間集計（MagiRanking 用）を加算 ── */
async function awardXeva(uid, amount, reason) {
  amount = Math.round(amount || 0);
  if (!uid || !amount) return { error: "arg" };
  try {
    await pushPending(uid, amount, reason);
    // 月間集計はここでは行わない。受け取り時に XEVA.add → xeva:earned → addMonthlyEarn で
    // 「全コンテンツのXEVA獲得量」として一本化して集計する（二重加算防止）。
    // ただし MagiChainParty の賞金は、MagiRanking の「MagiChainParty XEVAランキング」用に
    // 専用の月間集計(monthlyMcp)へも配布時点で加算する。
    if (amount > 0 && /MagiChainParty/i.test(reason || "")) {
      try { await runTransaction(ref(db, NODE + "/" + uid + "/monthlyMcp/" + monthKey()), (cur) => (cur || 0) + amount); } catch (e) {}
    }
    return { ok: true };
  } catch (e) { return { error: "net" }; }
}

/* ── MagiChainParty XEVA入手 月間ランキング（monthlyMcp を集計） ── */
async function getMcpRanking(ym) {
  ym = ym || monthKey();
  try {
    const snap = await get(ref(db, NODE));
    const rows = [];
    snap.forEach((c) => {
      const v = c.val() || {};
      const total = (v.monthlyMcp && v.monthlyMcp[ym]) || 0;
      rows.push({ uid: c.key, name: v.name || "?", charFile: v.charFile || "", total });
    });
    rows.sort((a, b) => b.total - a.total);
    return rows;
  } catch (e) { return []; }
}

/* ── 月間XEVA獲得量を加算（全コンテンツの獲得を集計。MagiRankingのランキング元データ） ── */
async function addMonthlyEarn(uid, amount) {
  amount = Math.round(amount || 0);
  if (!uid || amount <= 0) return { error: "arg" };
  try {
    await runTransaction(ref(db, NODE + "/" + uid + "/monthly/" + monthKey()), (cur) => (cur || 0) + amount);
    return { ok: true };
  } catch (e) { return { error: "net" }; }
}

/* ── 月間ランキングを取得（指定月。既定＝当月）。獲得0も含め合計降順 ── */
async function getRanking(ym) {
  ym = ym || monthKey();
  try {
    const snap = await get(ref(db, NODE));
    const rows = [];
    snap.forEach((c) => {
      const v = c.val() || {};
      const total = (v.monthly && v.monthly[ym]) || 0;
      rows.push({ uid: c.key, name: v.name || "?", charFile: v.charFile || "", total });
    });
    rows.sort((a, b) => b.total - a.total);
    return rows;
  } catch (e) { return []; }
}

/* ── 前月のランキング賞金を1回だけ受け取る（1位1000/2位500/3位200/4位以降100） ──
   pending へ push（＝集計には含めない）。rankClaimed/{prevYM} で二重受取防止。 */
async function claimRankReward(uid) {
  if (!uid) return { amount: 0 };
  const prev = prevMonthKey();
  try {
    const flagRef = ref(db, NODE + "/" + uid + "/rankClaimed/" + prev);
    const f = await get(flagRef);
    if (f.exists()) return { amount: 0 };
    const rows = await getRanking(prev);
    const idx = rows.findIndex((r) => r.uid === uid);
    await set(flagRef, true); // 対象外でもフラグを立てて再計算しない
    if (idx < 0 || !rows[idx].total) return { amount: 0 };
    const rank = idx + 1;
    const amount = rank === 1 ? 1000 : rank === 2 ? 500 : rank === 3 ? 200 : 100;
    await pushPending(uid, amount, "MagiRanking " + prev + " " + rank + "位 賞金");
    return { amount, rank };
  } catch (e) { return { amount: 0 }; }
}

/* ── pending の受取（合計を返し、受け取った分を削除）ポータル起動時に呼ぶ ── */
async function claimPending(uid) {
  if (!uid) return { total: 0, items: [] };
  try {
    const snap = await get(ref(db, NODE + "/" + uid + "/pending"));
    if (!snap.exists()) return { total: 0, items: [] };
    let total = 0; const items = [];
    snap.forEach((c) => { const v = c.val() || {}; total += (v.amount || 0); items.push({ amount: v.amount || 0, reason: v.reason || "" }); });
    await remove(ref(db, NODE + "/" + uid + "/pending"));
    return { total, items };
  } catch (e) { return { total: 0, items: [] }; }
}

/* ============================================================
   アカウント管理（管理者用）
   ・全アカウント一覧の取得 / アカウント削除
   ・UI 側でアクセスコード / デリートコードによるソフト保護
   ============================================================ */
async function getAllAccounts() {
  try {
    const snap = await get(ref(db, NODE));
    const rows = [];
    snap.forEach((c) => {
      const v = c.val() || {};
      let pendingCount = 0;
      if (v.pending) { try { pendingCount = Object.keys(v.pending).length; } catch (e) {} }
      const mk = monthKey();
      rows.push({
        uid: c.key,
        name: v.name || "?",
        charFile: v.charFile || "",
        hasPw: !!v.gamePwHash,
        createdAt: v.createdAt || 0,
        updatedAt: v.updatedAt || 0,
        lastLogin: v.lastLogin || 0,
        monthlyThis: (v.monthly && v.monthly[mk]) || 0,
        pendingCount
      });
    });
    rows.sort((a, b) => (b.lastLogin || b.updatedAt || 0) - (a.lastLogin || a.updatedAt || 0));
    return rows;
  } catch (e) { return []; }
}

/* 最終ログイン時刻を記録（ポータル起動時に呼ぶ） */
async function touchLastLogin(uid) {
  if (!uid) return;
  try { await update(ref(db, NODE + "/" + uid), { lastLogin: serverTimestamp() }); } catch (e) {}
}

/* アカウントを完全削除（accounts/{uid} と、その MagiCraft 記録も消す） */
async function deleteAccount(uid) {
  if (!uid) return { error: "arg" };
  try {
    await remove(ref(db, NODE + "/" + uid));
    try { await remove(ref(db, "magicraft/" + uid)); } catch (e) {}
    return { ok: true };
  } catch (e) { return { error: "net" }; }
}

/* ── そのアカウントに「中身」があるか ──
   store（同期されたセーブ）・4桁PW・ログイン履歴・pending のどれかがあれば、
   誰かが実際に使っているアカウント。名前の解放では絶対に消してはいけない。 */
function accountHasData(v) {
  if (!v || typeof v !== "object") return false;
  if (v.store && Object.keys(v.store).length) return true;
  if (v.gamePwHash) return true;
  if (v.lastLogin) return true;
  if (v.pending && Object.keys(v.pending).length) return true;
  if (v.monthly && Object.keys(v.monthly).length) return true;
  return false;
}

/* 表示名から「中身のない残骸レコード」だけを削除して名前を解放する。
   ・uid が失われた（orphan）レコードや、登録に失敗して名前だけ残ったレコードを掃除する。
   ・exceptUid を渡すと、そのレコードだけは残す（改名時に自分の現行レコードを守る用途）。
   ★ 2026-08-03 の重要な変更：中身のあるアカウントは消さない。
     旧実装は同名レコードを問答無用で全削除していたため、
     「ログアウト → 同じ名前で新規登録」でそれまでのアカウントが丸ごと消えていた。
     中身があるアカウントが残っている場合は removed:0, blocked:true を返し、
     呼び出し側は「この名前は使われています」として登録を止める。 */
async function deleteAccountByName(name, exceptUid) {
  const lower = lowerName(name);
  if (!lower) return { ok: true, removed: 0, blocked: false };
  // 対象を収集（インデックスクエリ→失敗時は全走査）
  const rows = [];
  try {
    const snap = await get(query(ref(db, NODE), orderByChild("nameLower"), equalTo(lower)));
    snap.forEach((c) => { if (c.key !== exceptUid) rows.push({ uid: c.key, v: c.val() }); });
  } catch (e) {
    try {
      const all = await get(ref(db, NODE));
      all.forEach((c) => { const u = c.val(); if (c.key !== exceptUid && u && lowerName(u.name) === lower) rows.push({ uid: c.key, v: u }); });
    } catch (e2) { return { error: "net" }; }
  }
  let removed = 0, blocked = false;
  for (const r of rows) {
    if (accountHasData(r.v)) { blocked = true; continue; }   // 使われているアカウントは触らない
    try {
      await remove(ref(db, NODE + "/" + r.uid));
      try { await remove(ref(db, "magicraft/" + r.uid)); } catch (e) {}
      removed++;
    } catch (e) {}
  }
  return { ok: true, removed, blocked };
}

/* ============================================================
   メンテナンスモード（管理者用）
   ・system/maintenance に { on, message } を保存
   ・全ページの maintenance-gate.js が読み取り、ON かつ非管理者をブロック
   ============================================================ */
async function getMaintenance() {
  try {
    const s = await get(ref(db, "system/maintenance"));
    const v = s.val() || {};
    return {
      on: !!v.on,
      type: v.type === "scheduled" ? "scheduled" : "emergency",
      reason: v.reason || "",
      message: v.message || "",
      until: v.until || 0,
      updatedAt: v.updatedAt || 0
    };
  } catch (e) { return { on: false, type: "emergency", reason: "", message: "", until: 0, updatedAt: 0 }; }
}

/* state = { on, type:"emergency"|"scheduled", reason, message, until }（until は scheduled のみ・ms） */
async function setMaintenance(state) {
  state = state || {};
  try {
    await set(ref(db, "system/maintenance"), {
      on: !!state.on,
      type: state.type === "scheduled" ? "scheduled" : "emergency",
      reason: String(state.reason == null ? "" : state.reason).slice(0, 120),
      message: String(state.message == null ? "" : state.message).slice(0, 300),
      until: state.type === "scheduled" ? Math.max(0, Math.round(state.until || 0)) : 0,
      updatedAt: serverTimestamp()
    });
    return { ok: true };
  } catch (e) { return { error: "net" }; }
}

/* ── アプリ個別メンテナンス（system/maintenanceApps/{appId}） ──
   appId は各アプリのフォルダ名を小文字化したもの（例: MagiBattle → "magibattle"）。
   グローバル(system/maintenance)とは独立に、そのアプリだけをメンテ中にできる。 */
function normAppId(id) { return String(id == null ? "" : id).trim().toLowerCase().replace(/[.$#\[\]\/\s]/g, ""); }

/* 全アプリのメンテ状態を { appId: state } で取得 */
async function getAppMaintenanceAll() {
  try {
    const s = await get(ref(db, "system/maintenanceApps"));
    const out = {};
    if (s.exists()) s.forEach((c) => {
      const v = c.val() || {};
      out[c.key] = {
        on: !!v.on,
        type: v.type === "scheduled" ? "scheduled" : "emergency",
        reason: v.reason || "", message: v.message || "",
        until: v.until || 0, updatedAt: v.updatedAt || 0
      };
    });
    return out;
  } catch (e) { return {}; }
}

/* 1アプリのメンテ状態 */
async function getAppMaintenance(appId) {
  appId = normAppId(appId);
  if (!appId) return { on: false, type: "emergency", reason: "", message: "", until: 0, updatedAt: 0 };
  try {
    const s = await get(ref(db, "system/maintenanceApps/" + appId));
    const v = s.val() || {};
    return {
      on: !!v.on, type: v.type === "scheduled" ? "scheduled" : "emergency",
      reason: v.reason || "", message: v.message || "", until: v.until || 0, updatedAt: v.updatedAt || 0
    };
  } catch (e) { return { on: false, type: "emergency", reason: "", message: "", until: 0, updatedAt: 0 }; }
}

/* 1アプリのメンテ状態を設定。state は setMaintenance と同形 */
async function setAppMaintenance(appId, state) {
  appId = normAppId(appId); state = state || {};
  if (!appId) return { error: "arg" };
  try {
    await set(ref(db, "system/maintenanceApps/" + appId), {
      on: !!state.on,
      type: state.type === "scheduled" ? "scheduled" : "emergency",
      reason: String(state.reason == null ? "" : state.reason).slice(0, 120),
      message: String(state.message == null ? "" : state.message).slice(0, 300),
      until: state.type === "scheduled" ? Math.max(0, Math.round(state.until || 0)) : 0,
      updatedAt: serverTimestamp()
    });
    return { ok: true };
  } catch (e) { return { error: "net" }; }
}

/* ============================================================
   MagiCraft レコード（クリアタイム＝タイムアタック／死亡回数）
   ・magicraft/{uid} に自己ベストを保存（速いほど上位・死亡少ないほど上位）
   ・MagiRanking から getMagiCraftRanking で参照
   ============================================================ */
const MC_NODE = "magicraft";

/* クリア記録を送信。自己ベスト（最速タイム・最少デス）だけ更新する */
async function submitMagiCraftRecord(uid, info, timeSec, deaths) {
  timeSec = Math.max(0, Math.round((timeSec || 0) * 10) / 10);
  deaths = Math.max(0, Math.round(deaths || 0));
  if (!uid || !timeSec) return { error: "arg" };
  try {
    await runTransaction(ref(db, MC_NODE + "/" + uid), (cur) => {
      cur = cur || {};
      cur.name = (info && info.name) || cur.name || "?";
      cur.nameLower = lowerName(cur.name);
      cur.charFile = (info && info.charFile != null) ? info.charFile : (cur.charFile || "");
      cur.clears = (cur.clears || 0) + 1;
      cur.lastTime = timeSec; cur.lastDeaths = deaths; cur.lastAt = Date.now();
      // 最速タイム
      if (cur.bestTime == null || timeSec < cur.bestTime) {
        cur.bestTime = timeSec; cur.bestTimeDeaths = deaths;
      }
      // 最少デス（同数ならタイムが速い方）
      if (cur.fewestDeaths == null || deaths < cur.fewestDeaths ||
          (deaths === cur.fewestDeaths && timeSec < (cur.fewestDeathsTime || Infinity))) {
        cur.fewestDeaths = deaths; cur.fewestDeathsTime = timeSec;
      }
      return cur;
    });
    return { ok: true };
  } catch (e) { return { error: "net" }; }
}

/* MagiCraft ランキング取得。sort = "time"（既定・最速昇順）| "deaths"（最少昇順） */
async function getMagiCraftRanking(sort) {
  try {
    const snap = await get(ref(db, MC_NODE));
    const rows = [];
    snap.forEach((c) => {
      const v = c.val() || {};
      if (v.bestTime == null) return;
      rows.push({
        uid: c.key, name: v.name || "?", charFile: v.charFile || "",
        bestTime: v.bestTime, bestTimeDeaths: v.bestTimeDeaths || 0,
        fewestDeaths: v.fewestDeaths == null ? (v.bestTimeDeaths || 0) : v.fewestDeaths,
        fewestDeathsTime: v.fewestDeathsTime || v.bestTime,
        clears: v.clears || 0
      });
    });
    if (sort === "deaths") {
      rows.sort((a, b) => (a.fewestDeaths - b.fewestDeaths) || (a.fewestDeathsTime - b.fewestDeathsTime));
    } else {
      rows.sort((a, b) => (a.bestTime - b.bestTime) || (a.bestTimeDeaths - b.bestTimeDeaths));
    }
    return rows;
  } catch (e) { return []; }
}

/* ============================================================
   MagiBurst 超特急 MAXSPEED の到達号車ランキング
   ・MagiBurst から submitBurstCar で自己ベストを送信
   ・MagiRanking から getBurstRanking で参照
   ============================================================ */
const MB_NODE = "magiburst";

/* 到達号車（自己ベストのみ更新） */
async function submitBurstCar(uid, info, car) {
  car = Math.max(0, Math.round(car || 0));
  if (!uid || !car) return { error: "arg" };
  try {
    await runTransaction(ref(db, MB_NODE + "/" + uid), (cur) => {
      cur = cur || {};
      cur.name = (info && info.name) || cur.name || "?";
      cur.nameLower = lowerName(cur.name);
      cur.charFile = (info && info.charFile != null) ? info.charFile : (cur.charFile || "");
      cur.runs = (cur.runs || 0) + 1;
      cur.lastCar = car; cur.lastAt = Date.now();
      if (cur.bestCar == null || car > cur.bestCar) { cur.bestCar = car; cur.bestAt = Date.now(); }
      return cur;
    });
    return { ok: true };
  } catch (e) { return { error: "net" }; }
}

/* ════════════════════════════════════════════════════════════
   MagiJackpot — プログレッシブ・ジャックポット（全員で共有するプール）
   ------------------------------------------------------------
   ★ なぜクラウドに置くか
     端末ごとに積むと「自分が回したぶんしか増えない」ので、
     ひとりで遊んでいるあいだ数字がほとんど動かない。
     プログレッシブの気持ちよさは「知らない誰かのベットでも増えていく」ことなので、
     プールは1本にして全員で共有する。

   ★ 二重取りを防ぐ
     当選は runTransaction で「読んで 0 にする」を1回の原子的な操作にする。
     同時に2人が当てても、先に通った方だけが amount を受け取り、
     もう片方は 0 を受け取る（＝同じプールが2回出ていくことはない）。
   ════════════════════════════════════════════════════════════ */
const MJ_NODE = "magijackpot";

/* 積立。amount は「ベット × 積立率 × 倍率」を呼び出し側で計算済みの値。 */
async function jackpotAdd(amount) {
  amount = Math.max(0, Math.round(amount || 0));
  if (!amount) return { ok: true };
  try {
    await runTransaction(ref(db, MJ_NODE + "/jp/pool"), (cur) => (cur || 0) + amount);
    return { ok: true };
  } catch (e) { return { error: "net" }; }
}

/* 毎日の上乗せ（運営からの積み増し）。
   ★ プールは全員で共有しているので、各端末がそのまま jackpotAdd すると
     「起動した人数ぶん」入ってしまう。そこで日付の印（seedDay）を
     トランザクションで取り合い、勝った1台だけが実際に積む。
     ＝ 1日ちょうど1回だけ、誰が最初に開いても入る。 */
async function jackpotDailySeed(amount, day) {
  amount = Math.max(0, Math.round(amount || 0));
  if (!amount || !day) return { seeded: false };
  let mine = false;
  try {
    const r = await runTransaction(ref(db, MJ_NODE + "/jp/seedDay"), (cur) => {
      if (cur === day) return;        // 今日はもう誰かが入れた＝中止（committed:false）
      mine = true;
      return day;
    });
    if (!r || !r.committed || !mine) return { seeded: false };
  } catch (e) { return { seeded: false }; }
  const a = await jackpotAdd(amount);
  if (a && a.error) return { seeded: false, error: a.error };
  return { seeded: true, amount: amount };
}

/* いまのプール額をリアルタイムで見張る（ホームの数字が伸びていく演出に使う）。
   戻り値を呼ぶと購読を止められる。 */
function jackpotWatch(cb, onErr) {
  try {
    return onValue(ref(db, MJ_NODE + "/jp/pool"), (s) => {
      const v = s.val();
      cb(typeof v === "number" ? v : 0);
    }, (err) => {
      /* ★ 2026-08-12 ここを黙って捨てていたのが「ずっと OFFLINE のまま」の一因。
         Realtime DB のルールに magijackpot が無いと permission_denied で購読が張れず、
         成功コールバックは<b>一度も呼ばれない</b>。呼び出し側へ知らせて、
         あとで読み直せるようにする（＝原因が画面から分かるようにする）。 */
      try { console.warn("[MagiJackpot] jackpotWatch failed:", err && err.message); } catch (e2) {}
      if (onErr) { try { onErr(err); } catch (e2) {} }
    });
  } catch (e) { if (onErr) { try { onErr(e); } catch (e2) {} } return function () {}; }
}
async function jackpotGet() {
  try { const s = await get(ref(db, MJ_NODE + "/jp/pool")); const v = s.val(); return typeof v === "number" ? v : 0; }
  catch (e) { return null; }
}

/* 当選。プールを 0 にして、そのとき入っていた額を返す。
   min 未満なら当たり扱いにしない（0 を返す）。 */
async function jackpotClaim(uid, name, min) {
  min = Math.max(0, Math.round(min || 0));
  let won = 0;
  try {
    await runTransaction(ref(db, MJ_NODE + "/jp/pool"), (cur) => {
      const v = typeof cur === "number" ? cur : 0;
      if (v < min || v <= 0) { won = 0; return v; }   // 触らずに終わる
      won = Math.floor(v);
      return 0;
    });
  } catch (e) { return 0; }
  if (won > 0 && uid) {
    /* 直近の当選者を残す（「さっき誰かが当てた」が見えると共有感が出る） */
    try {
      await push(ref(db, MJ_NODE + "/wins"), { uid: uid, name: String(name || "?").slice(0, 20), amount: won, ts: serverTimestamp() });
    } catch (e) {}
  }
  return won;
}

/* 直近の当選者（新しい順・最大 n 件） */
async function jackpotWinners(n) {
  try {
    const s = await get(ref(db, MJ_NODE + "/wins"));
    const rows = [];
    s.forEach((c) => { const v = c.val() || {}; rows.push({ name: v.name || "?", amount: v.amount || 0, ts: v.ts || 0 }); });
    rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return rows.slice(0, n || 10);
  } catch (e) { return []; }
}

/* ════════════════════════════════════════════════════════════
   Magi Lotto（デジタル宝くじ）— サーバー側の抽選まわり（2026-08-13）
   ────────────────────────────────────────────────────────────
   ★ ここが「抽選をサーバーで決める」ための土台。
     この製品には Cloud Functions が無く、使えるのは Realtime Database だけなので、
     <b>クライアントに選べない値でしか結果が決まらない</b>ようにして同じ性質を作る。

     ① 購入は「作るだけ・書き換え不可（create-only）」のノードに1回で書きこむ。
        中身は「どのゲームを・いくらで・どの数字で買ったか」＋ at: serverTimestamp()。
        ルールで <b>すでにある tx は上書きも削除もできない</b>ようにしてあるので、
        同じ txId で引き直すことはできない（＝二重購入・引き直しの両方を防ぐ）。
     ② 書きこんだあとに読み返すと、at が<b>サーバーの時刻</b>に解決されている。
        これはクライアントが選べない値。<b>賭けを確定させたあとでしか分からない</b>。
     ③ 結果は sha256(uid + txId + serverAt + salt) から決める。
        salt はその抽選回のもの（draws/{period}/salt）で、これもサーバーに1回だけ書かれる。
        → 出目はクライアントの乱数を1ビットも使わない。あとから誰でも検算できる。
     ④ 結果は tx/{txId}/result へ（これも create-only）。
        ここに書いてから通貨を動かすので、<b>通信が切れても結果と報酬は失われない</b>
        （次に開いたときに未精算ぶんを拾う）。

   ★ プール（Magi Grand Draw の賞金）は全員で共有する1本。
     runTransaction で積み・払い出すので、同時に当てても払い出しは1回だけ。
   ════════════════════════════════════════════════════════════ */
const ML_NODE = "magilotto";

/* sha256 → 16進文字列（結果の決定に使う。誰でも同じ手順で検算できる） */
async function mlHash(s) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s)));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) { return ""; }
}

/* ── 購入を1回だけ書きこむ（create-only）──
   戻り値 { ok, at }。at はサーバーが入れた時刻（結果を決める種）。
   すでに同じ txId があれば、そのときの at をそのまま返す（＝二重購入にならない）。 */
async function mlCommit(uid, txId, body) {
  if (!uid || !txId) return { error: "arg" };
  const p = ML_NODE + "/users/" + uid + "/tx/" + txId;
  try {
    const cur = await get(ref(db, p));
    if (cur.exists()) {
      const v = cur.val() || {};
      return { ok: true, at: v.at || 0, dup: true, result: v.result || null };
    }
    await set(ref(db, p), Object.assign({}, body, { at: serverTimestamp() }));
    const back = await get(ref(db, p));
    const v = back.val() || {};
    return { ok: true, at: v.at || 0, dup: false };
  } catch (e) { return { error: "net" }; }
}

/* ── 決まった結果を書き残す（create-only）── */
async function mlCommitResult(uid, txId, result) {
  if (!uid || !txId) return { error: "arg" };
  const p = ML_NODE + "/users/" + uid + "/tx/" + txId + "/result";
  try {
    const cur = await get(ref(db, p));
    if (cur.exists()) return { ok: true, dup: true, result: cur.val() };
    await set(ref(db, p), result);
    return { ok: true, dup: false };
  } catch (e) { return { error: "net" }; }
}

/* ── 精算済みの印（報酬を実際にウォレットへ入れたら立てる）── */
async function mlMarkPaid(uid, txId) {
  if (!uid || !txId) return { error: "arg" };
  try { await set(ref(db, ML_NODE + "/users/" + uid + "/tx/" + txId + "/paid"), serverTimestamp()); return { ok: true }; }
  catch (e) { return { error: "net" }; }
}

/* ── まだ精算していない購入を拾う（通信が切れた・アプリを閉じた回の救済）── */
async function mlPending(uid, max) {
  if (!uid) return [];
  try {
    const s = await get(ref(db, ML_NODE + "/users/" + uid + "/tx"));
    const out = [];
    s.forEach((c) => { const v = c.val() || {}; if (v.result && !v.paid) out.push(Object.assign({ id: c.key }, v)); });
    out.sort((a, b) => (a.at || 0) - (b.at || 0));
    return out.slice(0, max || 50);
  } catch (e) { return []; }
}

/* ── その抽選回（日付）の塩。1回だけ書かれ、以後は全員が同じ値を読む ──
   ★ これがあるおかげで「同じ txId・同じ時刻」でも回ごとに出目が変わる。 */
async function mlSalt(period) {
  const p = ML_NODE + "/salt/" + String(period || "").replace(/[.$#\[\]\/]/g, "-");
  try {
    const s = await get(ref(db, p));
    const v = s.val();
    if (typeof v === "string" && v) return v;
    /* まだ無ければ作る。同時に2人が来ても runTransaction で1つに決まる */
    let made = "";
    await runTransaction(ref(db, p), (cur) => {
      if (typeof cur === "string" && cur) { made = cur; return; }
      const a = new Uint32Array(4); crypto.getRandomValues(a);
      made = Array.from(a).map((x) => x.toString(16).padStart(8, "0")).join("");
      return made;
    });
    return made || "";
  } catch (e) { return ""; }
}

/* ── Magi Grand Draw の当せん番号（毎月1日・16日）──
   その回の分が無ければ、塩から決めて1回だけ書く。以後は全員がその値を読む。
   nums は「メイン3個（1〜range）＋MAGIボール1個」。 */
async function mlGrandDraw(period, range, mainN) {
  const key = String(period || "").replace(/[.$#\[\]\/]/g, "-");
  const p = ML_NODE + "/draws/" + key;
  try {
    const s = await get(ref(db, p));
    if (s.exists()) return s.val();
  } catch (e) { return null; }
  const salt = await mlSalt("grand:" + key);
  if (!salt) return null;
  const h = await mlHash("grand|" + key + "|" + salt);
  if (!h) return null;
  /* 16進のハッシュから、重複しない番号を順に取り出す（誰が計算しても同じ結果） */
  const R = Math.max(4, range | 0), N = Math.max(1, mainN | 0);
  const main = [];
  let i = 0;
  while (main.length < N && i < 30) {
    const v = parseInt(h.substr(i * 4, 4), 16) % R + 1;
    if (main.indexOf(v) < 0) main.push(v);
    i++;
  }
  main.sort((a, b) => a - b);
  let magi = 0;
  for (let k = 0; k < 30 && !magi; k++) {
    const v = parseInt(h.substr(60 + (k % 4) * 4 + k, 4) || h.substr(0, 4), 16) % R + 1;
    if (main.indexOf(v) < 0) magi = v;
  }
  if (!magi) magi = (main[0] % R) + 1;
  const val = { main, magi, salt, at: Date.now() };
  try {
    /* すでに誰かが書いていたら、そちらを正とする（＝全員おなじ番号になる） */
    let stored = null;
    await runTransaction(ref(db, p), (cur) => { if (cur) { stored = cur; return; } return val; });
    return stored || val;
  } catch (e) { return val; }
}

/* ── 賞金プール（全員で共有する1本）── */
async function mlPoolAdd(amount) {
  amount = Math.max(0, Math.round(amount || 0));
  if (!amount) return { ok: true };
  try { await runTransaction(ref(db, ML_NODE + "/pool/amount"), (cur) => (cur || 0) + amount); return { ok: true }; }
  catch (e) { return { error: "net" }; }
}
function mlPoolWatch(cb, onErr) {
  try {
    return onValue(ref(db, ML_NODE + "/pool/amount"), (s) => {
      const v = s.val(); cb(typeof v === "number" ? v : 0);
    }, (err) => { if (onErr) { try { onErr(err); } catch (e) {} } });
  } catch (e) { if (onErr) { try { onErr(e); } catch (e2) {} } return function () {}; }
}
async function mlPoolGet() {
  try { const s = await get(ref(db, ML_NODE + "/pool/amount")); const v = s.val(); return typeof v === "number" ? v : 0; }
  catch (e) { return null; }
}
/* 抽選回ごとの運営上乗せ。印（seedPeriod）を取り合って、1回だけ入れる。
   ★ ceiling を渡すと「プールがそこに届いていないぶんだけ」積む。
     運営の役目は最低保証を必ず用意することなので、そこから上は積まない
     （無制限に積むと、遊ばなくてもプールが育って 1等の期待値だけで還元率が 100% を超える）。 */
async function mlPoolSeed(amount, period, ceiling) {
  amount = Math.max(0, Math.round(amount || 0));
  if (!amount || !period) return { seeded: false };
  /* 先に「積む必要があるか」を見る（印を無駄に消費しないため） */
  let add = amount;
  if (ceiling != null) {
    try {
      const s = await get(ref(db, ML_NODE + "/pool/amount"));
      const cur = typeof s.val() === "number" ? s.val() : 0;
      add = Math.min(amount, Math.max(0, Math.round(ceiling) - cur));
    } catch (e) { return { seeded: false, error: "net" }; }
    if (add <= 0) return { seeded: false, full: true };
  }
  let mine = false;
  try {
    const r = await runTransaction(ref(db, ML_NODE + "/pool/seedPeriod"), (cur) => {
      if (cur === period) return;      // もう誰かが入れた
      mine = true; return period;
    });
    if (!r || !r.committed || !mine) return { seeded: false };
  } catch (e) { return { seeded: false }; }
  const a = await mlPoolAdd(add);
  if (a && a.error) return { seeded: false, error: a.error };
  return { seeded: true, amount: add };
}
/* 1等の払い出し。プールを空にして、そのとき入っていた額（最低保証で底上げ）を返す。 */
async function mlPoolClaim(uid, name, minGuarantee) {
  const floor = Math.max(0, Math.round(minGuarantee || 0));
  let won = 0;
  try {
    await runTransaction(ref(db, ML_NODE + "/pool/amount"), (cur) => {
      const v = typeof cur === "number" ? cur : 0;
      won = Math.max(floor, Math.floor(v));   // 足りない分は運営が保証する
      return 0;
    });
  } catch (e) { return 0; }
  if (won > 0 && uid) {
    try { await push(ref(db, ML_NODE + "/wins"), { uid, name: String(name || "?").slice(0, 20), amount: won, ts: serverTimestamp() }); } catch (e) {}
  }
  return won;
}
async function mlWinners(n) {
  try {
    const s = await get(ref(db, ML_NODE + "/wins"));
    const rows = [];
    s.forEach((c) => { const v = c.val() || {}; rows.push({ name: v.name || "?", amount: v.amount || 0, ts: v.ts || 0 }); });
    rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return rows.slice(0, n || 10);
  } catch (e) { return []; }
}

/* ── 運営の設定（販売価格・確率・報酬・最低保証）──
   管理画面から書き、全端末が読む。無ければ ml-core.js の既定値を使う。 */
async function mlGetConfig() {
  try { const s = await get(ref(db, ML_NODE + "/cfg")); return s.exists() ? s.val() : null; }
  catch (e) { return null; }
}
async function mlSetConfig(cfg) {
  try { await set(ref(db, ML_NODE + "/cfg"), Object.assign({}, cfg, { updatedAt: serverTimestamp() })); return { ok: true }; }
  catch (e) { return { error: "net" }; }
}
/* ── 実測（総購入額・総払戻額・当選ランクごとの回数）。管理画面の「実測還元率」用 ── */
async function mlStatAdd(game, wagered, won, tier) {
  try {
    const base = ML_NODE + "/stats";
    const ops = [
      runTransaction(ref(db, base + "/wagered"), (c) => (c || 0) + Math.round(wagered || 0)),
      runTransaction(ref(db, base + "/won"), (c) => (c || 0) + Math.round(won || 0)),
      runTransaction(ref(db, base + "/plays"), (c) => (c || 0) + 1),
    ];
    if (game) {
      ops.push(runTransaction(ref(db, base + "/byGame/" + game + "/wagered"), (c) => (c || 0) + Math.round(wagered || 0)));
      ops.push(runTransaction(ref(db, base + "/byGame/" + game + "/won"), (c) => (c || 0) + Math.round(won || 0)));
      ops.push(runTransaction(ref(db, base + "/byGame/" + game + "/plays"), (c) => (c || 0) + 1));
    }
    if (tier) ops.push(runTransaction(ref(db, base + "/tiers/" + game + "_" + tier), (c) => (c || 0) + 1));
    await Promise.all(ops);
    return { ok: true };
  } catch (e) { return { error: "net" }; }
}
async function mlGetStats() {
  try { const s = await get(ref(db, ML_NODE + "/stats")); return s.exists() ? s.val() : null; }
  catch (e) { return null; }
}

/* 到達号車ランキング（多い順） */
async function getBurstRanking() {
  try {
    const snap = await get(ref(db, MB_NODE));
    const rows = [];
    snap.forEach((c) => {
      const v = c.val() || {};
      if (!v.bestCar) return;
      rows.push({
        uid: c.key, name: v.name || "?", charFile: v.charFile || "",
        bestCar: v.bestCar, runs: v.runs || 0, bestAt: v.bestAt || 0,
      });
    });
    rows.sort((a, b) => (b.bestCar - a.bestCar) || (a.bestAt - b.bestAt));   // 同着は先に到達した人が上
    return rows;
  } catch (e) { return []; }
}

/* ============================================================
   クラウドアカウント：ストア同期 ＋ 単一アクティブセッション
   ・accounts/{uid}/store/{safeKey} = 同期対象 localStorage 値（JSON文字列）
   ・accounts/{uid}/session = { deviceId, ts } … 最後に開いた端末が勝つ
   ============================================================ */
// Firebase キーに使えない文字（. $ # [ ] /）をエスケープ。allowlist は [a-z0-9_] のみだが保険。
function encKey(k) { return String(k).replace(/[.$#\[\]\/]/g, (c) => "_" + c.charCodeAt(0).toString(16) + "_"); }
function decKey(k) { return String(k).replace(/_([0-9a-f]{2})_/g, (m, h) => String.fromCharCode(parseInt(h, 16))); }

/* ストア全体を取得。{ key: valueString } を返す（値は各 localStorage の生JSON文字列） */
async function pullStore(uid) {
  if (!uid) return {};
  try {
    const s = await get(ref(db, NODE + "/" + uid + "/store"));
    if (!s.exists()) return {};
    const out = {};
    s.forEach((c) => { out[decKey(c.key)] = c.val(); });
    return out;
  } catch (e) { return {}; }
}

/* 変更キーだけを push。
   kv = { key: valueString | null }（旧形式）または { key: {v: valueString|null, t: ms} }（v3形式）。
   v=null は削除（storeT は残してトゥームストーン＝他端末での復活を防ぐ）。 */
async function pushStore(uid, kv) {
  if (!uid || !kv) return { error: "arg" };
  const upd = {};
  Object.keys(kv).forEach((k) => {
    const e = kv[k]; const ek = encKey(k);
    if (e && typeof e === "object" && "v" in e) { upd["store/" + ek] = e.v; upd["storeT/" + ek] = e.t || now(); }
    else { upd["store/" + ek] = e; upd["storeT/" + ek] = now(); }
  });
  if (!Object.keys(upd).length) return { ok: true };
  try { await update(ref(db, NODE + "/" + uid), upd); return { ok: true }; }
  catch (e) { return { error: "net" }; }
}

/* ── 離脱時でも確実に届く push（iPhone対策の要） ──
   iOS ではホームに戻る・アプリを切り替える・タブを閉じるといった瞬間に
   ページが即座に凍結／破棄され、実行中の SDK の書込（Promise）は捨てられる。
   そのため「XEVAを使った直後にアプリを閉じる」と、その変更がクラウドに届かず、
   次に開いたときクラウドの古い残高に巻き戻る。
   fetch(keepalive) はページが破棄された後もブラウザが送信を続けてくれるので、
   pagehide / visibilitychange のタイミングではこちらを使う。
   ※ keepalive の本文上限は 64KB。超える分は通常の push に任せる。 */
const BEACON_MAX = 60 * 1024;
function pushStoreBeacon(uid, kv) {
  if (!uid || !kv) return false;
  const body = {};
  Object.keys(kv).forEach((k) => {
    const e = kv[k]; const ek = encKey(k);
    const v = (e && typeof e === "object" && "v" in e) ? e.v : e;
    const t = (e && typeof e === "object" && e.t) ? e.t : now();
    body["store/" + ek] = v;
    body["storeT/" + ek] = t;
  });
  if (!Object.keys(body).length) return true;
  let json;
  try { json = JSON.stringify(body); } catch (e) { return false; }
  const url = DB_URL + "/" + NODE + "/" + uid + ".json";
  if (json.length > BEACON_MAX) {
    /* keepalive の 64KB を超える量（全ゲームのセーブがまとめて溜まった場合）。
       ここで諦めると、進めた人ほど保存されない側に落ちてしまうので、
       離脱の瞬間だけ同期XHRで送り切る（ページはどうせ閉じるので体感への影響はない）。 */
    try {
      const x = new XMLHttpRequest();
      x.open("PATCH", url, false);
      x.setRequestHeader("Content-Type", "application/json");
      x.send(json);
      return true;
    } catch (e) { return false; }
  }
  try {
    fetch(url, {
      method: "PATCH", body: json, keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
    return true;
  } catch (e) { return false; }
}

/* ストア＋per-keyタイムスタンプを取得。{ kv: {key: valueString}, t: {key: ms} } */
async function pullStoreFull(uid) {
  if (!uid) return { kv: {}, t: {} };
  try {
    const [s, st] = await Promise.all([
      get(ref(db, NODE + "/" + uid + "/store")),
      get(ref(db, NODE + "/" + uid + "/storeT")),
    ]);
    const kv = {}, t = {};
    if (s.exists()) s.forEach((c) => { kv[decKey(c.key)] = c.val(); });
    if (st.exists()) st.forEach((c) => { t[decKey(c.key)] = c.val(); });
    return { kv, t };
  } catch (e) { return { kv: {}, t: {} }; }
}

/* 同期マージで負けた側のローカル値を退避（復旧用の1世代バックアップ） */
async function pushBackup(uid, bak) {
  if (!uid || !bak) return { error: "arg" };
  const upd = {};
  Object.keys(bak).forEach((k) => {
    const e = bak[k] || {};
    upd["storeBak/" + encKey(k)] = { v: e.v == null ? null : String(e.v), t: e.t || 0, at: Date.now() };
  });
  if (!Object.keys(upd).length) return { ok: true };
  try { await update(ref(db, NODE + "/" + uid), upd); return { ok: true }; }
  catch (e) { return { error: "net" }; }
}

/* ── セッションはアプリごとに分けて持つ（accounts/{uid}/sessions/{appId}） ──
   旧実装は accounts/{uid}/session の1本だけで、どのアプリを開いても同じ枠を奪い合っていた。
   そのため「PCでポータル、iPhoneでMagiBurst」のように別アプリを開いただけで
   互いを追い出し合い、アクセス画面／ログイン画面に戻される原因になっていた。
   同一アプリが別端末で開かれた時だけ追い出す。 */
function sessRef(uid, appId) { return ref(db, NODE + "/" + uid + "/sessions/" + normAppId(appId || "portal")); }

/* この端末をそのアプリのアクティブセッションとして主張（最後に書いた端末が勝つ） */
async function claimSession(uid, deviceId, appId) {
  if (!uid || !deviceId) return { error: "arg" };
  try { await set(sessRef(uid, appId), { deviceId: String(deviceId), ts: serverTimestamp() }); return { ok: true }; }
  catch (e) { return { error: "net" }; }
}

/* セッション監視。cb(session|null) を購読解除関数付きで返す */
function watchSession(uid, cb, appId) {
  if (!uid || typeof cb !== "function") return () => {};
  try {
    return onValue(sessRef(uid, appId), (s) => { cb(s.exists() ? s.val() : null); });
  } catch (e) { return () => {}; }
}

/* ログアウト：自分がアクティブなセッションのときだけ消す（他端末のを消さない）。
   ログアウトは端末単位の操作なので、このアカウントの全アプリぶんを対象にする。 */
async function logoutSession(uid, deviceId, appId) {
  if (!uid) return { error: "arg" };
  try {
    const all = await get(ref(db, NODE + "/" + uid + "/sessions"));
    const jobs = [];
    if (all.exists()) all.forEach((c) => {
      const cur = c.val();
      if (cur && deviceId && cur.deviceId !== deviceId) return;   // 他端末のセッションは残す
      jobs.push(remove(sessRef(uid, c.key)));
    });
    if (!jobs.length && appId) jobs.push(remove(sessRef(uid, appId)));
    try { await remove(ref(db, NODE + "/" + uid + "/session")); } catch (e) {}   // 旧形式の後始末
    await Promise.all(jobs);
    return { ok: true };
  } catch (e) { return { error: "net" }; }
}

/* uid からアカウントのコア情報を取得（ログイン確立後の同期用） */
async function getAccount(uid) {
  if (!uid) return null;
  try { const s = await get(ref(db, NODE + "/" + uid)); return s.exists() ? { uid, ...s.val() } : null; }
  catch (e) { return null; }
}

/* ★ 2026-08-05 アカウントが「本当に消えているか」を確かめる。
   ・true  … 確かに存在しない（アカウント管理から削除された）
   ・false … 存在する
   ・null  … <b>確かめられなかった</b>（通信エラー・権限エラーなど）
   getAccount は失敗しても null を返すので、それだけで「消えた」と判断すると
   電波が悪いだけの端末のデータまで消してしまう。判定には必ずこちらを使うこと。 */
async function accountGone(uid) {
  if (!uid) return null;
  try {
    const s = await get(ref(db, NODE + "/" + uid + "/name"));
    return !s.exists();                  // name が無い＝レコードが無い＝消えている
  } catch (e) { return null; }           // 確かめられなかった（＝何もしない）
}

/* ════════════ MagiBurst 助っ人（2026-08-05） ════════════
   ・自分が貸し出すキャラ（属性ごとに5体・育成状況つき）を、自分のアカウント直下
     accounts/{uid}/mbLend に公開する。フレンド一覧から getLendRoster で読める。
   ・セーブ本体（store）とは別枠。ここに置くのは「見せてよい情報だけ」＝
     キャラID・レベル・限界突破・ルーン・紋章に限る。 */
async function setLendRoster(uid, data) {
  if (!uid) return { error: "nouid" };
  try { await set(ref(db, NODE + "/" + uid + "/mbLend"), data || null); return { ok: true }; }
  catch (e) { return { error: "net" }; }
}
async function getLendRoster(uid) {
  if (!uid) return null;
  try { const s = await get(ref(db, NODE + "/" + uid + "/mbLend")); return s.exists() ? s.val() : null; }
  catch (e) { return null; }
}

/* ════════════ フレンド（XEVARION アカウント主体） ════════════
   ・friends/{相手uid} を「お互いに」持つ相互フレンド方式。
   ・申請は相手の friendReq/{自分uid} に置き、相手が承認すると双方に入る。
   ・presence（最終アクセス時刻＋どのアプリか）と room（いま開いている部屋番号）を
     公開することで、フレンド一覧から「番号を聞かずに」合流できる。 */
const FRIEND_MAX = 100;
const ONLINE_MS = 5 * 60 * 1000;   // 5分以内のアクセスをオンライン扱い

/* いまこのアプリを開いていることを知らせる（各アプリの起動時に呼ぶ） */
async function setPresence(uid, appId) {
  if (!uid) return false;
  try {
    await update(ref(db, NODE + "/" + uid + "/presence"), { at: Date.now(), app: String(appId || "portal") });
    return true;
  } catch (e) { return false; }
}

/* 部屋を作った／入ったことを公開（フレンドが番号なしで合流できる） */
async function publishRoom(uid, appId, code, stage) {
  if (!uid || !code) return false;
  try {
    await set(ref(db, NODE + "/" + uid + "/room"), {
      app: String(appId), code: String(code), stage: String(stage || ""), at: Date.now(),
    });
    return true;
  } catch (e) { return false; }
}
async function clearRoom(uid) {
  if (!uid) return false;
  try { await remove(ref(db, NODE + "/" + uid + "/room")); return true; } catch (e) { return false; }
}

/* フレンド申請を送る */
async function sendFriendReq(fromUid, toUid) {
  if (!fromUid || !toUid || fromUid === toUid) return { error: "self" };
  try {
    const mine = await get(ref(db, NODE + "/" + fromUid + "/friends"));
    if (mine.exists() && Object.keys(mine.val() || {}).length >= FRIEND_MAX) return { error: "full" };
    /* 相手からすでに申請が来ていたら、その場で相互フレンド成立 */
    const inc = await get(ref(db, NODE + "/" + fromUid + "/friendReq/" + toUid));
    if (inc.exists()) return await acceptFriendReq(fromUid, toUid);
    await set(ref(db, NODE + "/" + toUid + "/friendReq/" + fromUid), Date.now());
    return { ok: true, sent: true };
  } catch (e) { return { error: "net" }; }
}

/* 申請を承認して相互フレンドにする */
async function acceptFriendReq(uid, fromUid) {
  if (!uid || !fromUid) return { error: "arg" };
  try {
    const now = Date.now();
    await update(ref(db), {
      [NODE + "/" + uid + "/friends/" + fromUid]: now,
      [NODE + "/" + fromUid + "/friends/" + uid]: now,
      [NODE + "/" + uid + "/friendReq/" + fromUid]: null,
      [NODE + "/" + fromUid + "/friendReq/" + uid]: null,
    });
    return { ok: true, accepted: true };
  } catch (e) { return { error: "net" }; }
}

/* 申請を断る */
async function rejectFriendReq(uid, fromUid) {
  try { await remove(ref(db, NODE + "/" + uid + "/friendReq/" + fromUid)); return { ok: true }; }
  catch (e) { return { error: "net" }; }
}

/* フレンド解除（相互に消す） */
async function removeFriend(uid, other) {
  try {
    await update(ref(db), {
      [NODE + "/" + uid + "/friends/" + other]: null,
      [NODE + "/" + other + "/friends/" + uid]: null,
    });
    return { ok: true };
  } catch (e) { return { error: "net" }; }
}

/* フレンド一覧（プロフィール・オンライン状態・開いている部屋つき） */
async function listFriends(uid) {
  if (!uid) return [];
  try {
    const snap = await get(ref(db, NODE + "/" + uid + "/friends"));
    const ids = snap.exists() ? Object.keys(snap.val() || {}) : [];
    const now = Date.now();
    const rows = await Promise.all(ids.map(async (id) => {
      const a = await getAccount(id);
      if (!a) return null;
      const pr = a.presence || {};
      /* ★ 最終ログイン時刻（pr.at）はフレンドに渡さない。
         「いま遊べるか」を知るのに必要なのは online の真偽だけで、
         生の時刻まで返すと画面に出さなくても端末側から読み取れてしまう。
         並び順も lastAt をやめて〈オンライン → 名前〉にする。 */
      return {
        uid: id, name: a.name || "?", charFile: a.charFile || "",
        online: !!(pr.at && now - pr.at < ONLINE_MS),
        app: pr.app || "",
        room: a.room && a.room.code ? a.room : null,
        monthly: a.monthly || {},
      };
    }));
    return rows.filter(Boolean)
      .sort((x, y) => (y.online - x.online) || String(x.name).localeCompare(String(y.name), "ja"));
  } catch (e) { return []; }
}

/* ══ プレイヤー一覧（★ 2026-08-06 追加） ══
   名前を知らないとフレンドを増やせなかったので、「いる人をそのまま並べる」入口を作る。
   ・並びは〈オンライン → 名前〉。listFriends と同じ考え方で、
     最終アクセス時刻そのもの（presence.at）は返さない（online の真偽だけ）。
     時刻を渡すと、画面に出さなくても端末側から生活時間帯を読み取れてしまうため。
   ・自分・すでにフレンド・申請済み・申請が届いている人には印を付けて返し、
     画面側でボタンの出し分けに使う。
   ・戻り値の rel は "me" / "friend" / "sent" / "got" / ""。 */
async function listPlayers(uid, limit) {
  const max = Math.max(1, Math.min(200, Number(limit) || 60));
  try {
    const snap = await get(ref(db, NODE));
    const now = Date.now();
    /* 自分のフレンド・申請の状況は、自分のノードから読む（1回で済ませる） */
    let myFriends = {}, myGot = {};
    const meSnap = uid ? await get(ref(db, NODE + "/" + uid)) : null;
    if (meSnap && meSnap.exists()) {
      const mv = meSnap.val() || {};
      myFriends = mv.friends || {};
      myGot = mv.friendReq || {};
    }
    const rows = [];
    snap.forEach((c) => {
      const v = c.val() || {};
      if (!v.name) return;
      const pr = v.presence || {};
      /* 相手のノードの friendReq に自分がいれば「申請済み」 */
      const sent = !!(v.friendReq && uid && v.friendReq[uid]);
      const id = c.key;
      rows.push({
        uid: id, name: v.name, charFile: v.charFile || "",
        online: !!(pr.at && now - pr.at < ONLINE_MS),
        app: pr.app || "",
        rel: id === uid ? "me" : myFriends[id] ? "friend" : myGot[id] ? "got" : sent ? "sent" : "",
      });
    });
    rows.sort((x, y) => (y.online - x.online) || String(x.name).localeCompare(String(y.name), "ja"));
    return rows.slice(0, max);
  } catch (e) { return []; }
}

/* 届いているフレンド申請 */
async function listFriendReqs(uid) {
  if (!uid) return [];
  try {
    const snap = await get(ref(db, NODE + "/" + uid + "/friendReq"));
    const ids = snap.exists() ? Object.keys(snap.val() || {}) : [];
    const rows = await Promise.all(ids.map(async (id) => {
      const a = await getAccount(id);
      return a ? { uid: id, name: a.name || "?", charFile: a.charFile || "" } : null;
    }));
    return rows.filter(Boolean);
  } catch (e) { return []; }
}

window.XEVARIONFB = {
  ready: true,
  hashPw, isNameTaken, findByName, searchAccounts, register, updateProfile,
  verifyGamePw, awardXeva, addMonthlyEarn, claimPending,
  monthKey, prevMonthKey, getRanking, getMcpRanking, claimRankReward,
  submitMagiCraftRecord, getMagiCraftRanking,
  submitBurstCar, getBurstRanking,
  // MagiJackpot プログレッシブ・ジャックポット（全員で共有）
  jackpotAdd, jackpotDailySeed, jackpotWatch, jackpotGet, jackpotClaim, jackpotWinners,
  // Magi Lotto（サーバー抽選・共有プール・運営設定・実測還元率）
  mlHash, mlCommit, mlCommitResult, mlMarkPaid, mlPending, mlSalt, mlGrandDraw,
  mlPoolAdd, mlPoolWatch, mlPoolGet, mlPoolSeed, mlPoolClaim, mlWinners,
  mlGetConfig, mlSetConfig, mlStatAdd, mlGetStats,
  getAllAccounts, deleteAccount, deleteAccountByName, touchLastLogin,
  getMaintenance, setMaintenance,
  // アプリ個別メンテナンス
  getAppMaintenanceAll, getAppMaintenance, setAppMaintenance,
  // クラウドアカウント（ストア同期・セッション）
  pullStore, pushStore, pullStoreFull, pushBackup, claimSession, watchSession, logoutSession, getAccount,
  // 同期の土台（サーバー時刻・離脱時の確実な送信）
  now, serverSkew, pushStoreBeacon, DB_URL,
  // フレンド（XEVARION アカウント主体）
  setPresence, publishRoom, clearRoom,
  sendFriendReq, acceptFriendReq, rejectFriendReq, removeFriend, listFriends, listFriendReqs,
  // MagiBurst 助っ人（フレンドに貸し出すキャラ）
  setLendRoster, getLendRoster,
  // アカウントが削除済みかの確認（true=消えている／false=ある／null=確かめられない）
  accountGone,
  listPlayers,
  FRIEND_MAX, ONLINE_MS
};
try { window.dispatchEvent(new Event("xevarionfb:ready")); } catch (e) {}
