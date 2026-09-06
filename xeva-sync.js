// ============================================================
// XEVA-Sync — XEVARION アカウント ↔ MagiLink (Firebase) 同期
//   役割:
//     1) XEVARION アカウント登録時に MagiLink の Firebase ユーザーを作成・紐づけ
//     2) 表示名 / アイコン / 誕生日の変更を Firebase に同期
//     3) 表示名のグローバル一意チェック（全端末で同じ名前は1つだけ）
//   window.XEVASync として公開。読み込み完了で "xevasync:ready" を発火。
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getDatabase, ref, set, update, get, push, remove,
  query, orderByChild, equalTo, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

// MagiLink と同一の Firebase プロジェクト（★ 2026-08-20 xevarion-online へ移行）
const firebaseConfig = {
  /* ★★ 2026-08-20 magilink-63067 から <b>xevarion-online</b> へ移した。
     XEVARION が使う Firebase を firebase-rules/ の4つにそろえるため。
     ★ プロジェクト間でデータは移らない。
       古い magilink-63067 に入っていたメッセージ・友達・掲示板は
       <b>引き継がれず、まっさらから始まる</b>（移すなら手で書き出して入れ直す）。
     ★ 使うノード（board / friendRequests / friends / groups / messages /
       sentReq / users）は xevarion-online の rooms・scores・mcp とぶつからない。
       ルールは firebase-rules/xevarion-online.rules.json に足してある。 */
  apiKey: "AIzaSyAivkOwjWlmqJSNmnSjOs4-PUAcVFOfbiY",
  authDomain: "xevarion-online.firebaseapp.com",
  databaseURL: "https://xevarion-online-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "xevarion-online",
  storageBucket: "xevarion-online.firebasestorage.app",
  messagingSenderId: "513584168485",
  appId: "1:513584168485:web:d2a009325df677b746c9cc",
  measurementId: "G-28C5G2BFR5"
};
/* ★ 2026-08-20 名前を付ける（xevarion-fb.js の名無しアプリとぶつけないため）。
   これまでは SDK の版がちがう（12.14 と 12.15）ので偶然すみ分けていたが、
   版をそろえた瞬間に「[DEFAULT] はすでにある」で落ちる作りだった。 */
const app = initializeApp(firebaseConfig, "xeva-sync");
const db = getDatabase(app);

const ACC_KEY = "xeva_account_v1";
const CHARS_BASE = "https://merurungx-glitch.github.io/xevarion/chars/";

function loadAcc() { try { return JSON.parse(localStorage.getItem(ACC_KEY) || "null"); } catch (e) { return null; } }
function saveAcc(a) { try { localStorage.setItem(ACC_KEY, JSON.stringify(a)); } catch (e) {} }

// XEVARION キャラ画像をアバターに変換
function charAvatar(acc) {
  /* 保存された charFile は移籍前の古いパスのことがあるので正規化してから使う。
     ここで直さないと MagiLink 側に 404 のURLがそのまま保存されてしまう。 */
  const cf = (acc && window.XEVA && window.XEVA.canonCharFile)
    ? window.XEVA.canonCharFile(acc.charFile, acc.charId) : (acc && acc.charFile);
  if (cf) return { avatar: CHARS_BASE + cf, avatarType: "img" };
  return { avatar: "🙂", avatarType: "emoji" };
}

/* ★★ 2026-09-05 コレクションは <b>XEVARION 全体で1本</b>（xeva-collection.js）。
   これまでは XEVAガチャの CHAR_MASTER にある id しか通さなかったので、
   <b>MagiBurst で引いたキャラが1体も入らなかった</b>（ご報告「すべてのキャラが実装されていない」）。
   ★ MagiBurst のキャラは id が "mb:xxx"。XEVAガチャの "xxx" とは別人なので混ぜないこと。 */
function collectionIds(acc) {
  if (window.XevaCollection) return window.XevaCollection.ids();
  var ids = {};
  try {
    var g = JSON.parse(localStorage.getItem("xeva_gacha_v1") || "null");
    if (g && g.owned) Object.keys(g.owned).forEach(function (id) { if (g.owned[id]) ids[id] = true; });
  } catch (e) {}
  if (acc && acc.charId) ids[acc.charId] = true;
  var chars = (window.XEVA && window.XEVA.CHARS) ? window.XEVA.CHARS : [];
  return Object.keys(ids).filter(function (id) { return chars.some(function (c) { return c.id === id; }); });
}

// 凸（重複）レベル: xeva_gacha_v1.dupes（id→0〜4）。所持キャラのみ返す
function collectionDupes(acc) {
  if (window.XevaCollection) return window.XevaCollection.dupes();
  var out = {};
  var owned = collectionIds(acc);
  try {
    var g = JSON.parse(localStorage.getItem("xeva_gacha_v1") || "null");
    if (g && g.dupes) owned.forEach(function (id) { if (g.dupes[id]) out[id] = g.dupes[id]; });
  } catch (e) {}
  return out;
}

// ショーケース（推しキャラ）の charId 配列 → 画像URL配列
function showcaseUrls(acc) {
  const ids = (acc && Array.isArray(acc.showcase)) ? acc.showcase.slice(0, 3) : [];
  const chars = (window.XEVA && window.XEVA.CHARS) ? window.XEVA.CHARS : [];
  return ids.map((id) => { const c = chars.find((x) => x.id === id); return c ? CHARS_BASE + c.file : null; }).filter(Boolean);
}

// 表示名がすでに使われているか（exceptUid は自分自身を除外）
async function isNameTaken(name, exceptUid) {
  name = (name || "").trim();
  if (!name) return false;
  try {
    // インデックス付きクエリ（高速）
    const snap = await get(query(ref(db, "users"), orderByChild("name"), equalTo(name)));
    let taken = false;
    snap.forEach((c) => { if (c.key !== exceptUid) taken = true; });
    return taken;
  } catch (e) {
    // クエリ失敗（インデックス未設定など）時は全ユーザーを読んで確実に照合する
    try {
      const all = await get(ref(db, "users"));
      let taken = false;
      all.forEach((c) => { const u = c.val(); if (c.key !== exceptUid && u && (u.name || "").trim() === name) taken = true; });
      return taken;
    } catch (e2) { return false; }
  }
}

// 表示名から既存ユーザーの uid を1件取得（名前はグローバル一意なので自分自身のはず）
async function findUserByName(name) {
  name = (name || "").trim();
  if (!name) return null;
  try {
    const snap = await get(query(ref(db, "users"), orderByChild("name"), equalTo(name)));
    let uid = null; snap.forEach((c) => { if (!uid) uid = c.key; });
    return uid;
  } catch (e) {
    try {
      const all = await get(ref(db, "users"));
      let uid = null;
      all.forEach((c) => { const u = c.val(); if (!uid && u && (u.name || "").trim() === name) uid = c.key; });
      return uid;
    } catch (e2) { return null; }
  }
}

// 登録時: Firebase ユーザーを作成し mlUid を紐づける。
//   戻り値 { uid } 成功 / { error:'name' } 名前重複 / { error:... } その他
//   ※ 登録フロー専用。名前が他人と衝突していれば作成せず error:'name' を返す。
async function linkAccount(acc) {
  acc = loadAcc() || acc;                 // 常に最新のストレージを優先（別ページが書き戻した mlUid を取りこぼさない）
  if (!acc || !acc.name) return { error: "noacc" };
  // すでにリンク済みなら同期だけ行う
  if (acc.mlUid) {
    try {
      const s = await get(ref(db, "users/" + acc.mlUid));
      if (s.exists()) { await syncProfile(acc); return { uid: acc.mlUid }; }
    } catch (e) {}
  }
  /* ★★ 2026-09-05 同名がいてもすぐにはあきらめない。
     XEVARION（accounts）ではもう使われていない名前でも、MagiLink（users）に
     残りかすが居ると永久に登録できなくなっていた（ご報告）。
     ここに来るのは呼び出し側がすでに accounts を見て「空いている」と判断したときなので、
     残りかすを消してからもう一度だけ見る。 */
  if (await isNameTaken(acc.name, acc.mlUid)) {
    try { await deleteUserByName(acc.name, acc.mlUid); } catch (e) {}
    if (await isNameTaken(acc.name, acc.mlUid)) return { error: "name" };
  }
  const { avatar, avatarType } = charAvatar(acc);
  const node = push(ref(db, "users"));
  const uid = node.key;
  const data = {
    name: acc.name, avatar, avatarType, color: "#5b8cff",
    bio: "", bday: acc.bday || "", pwHash: "",
    showcase: showcaseUrls(acc), collection: collectionIds(acc), collectionDupes: collectionDupes(acc),
    online: false, lastSeen: serverTimestamp(), createdAt: serverTimestamp(), source: "xevarion"
  };
  try { await set(node, data); } catch (e) { return { error: "net" }; }
  acc.mlUid = uid; saveAcc(acc);
  return { uid };
}

// mlUid が失われた登録済みアカウントを、Firebase 上の自分（＝同名ユーザー）に再紐づけする。
//   見つからなければ1回だけ新規作成。多重呼び出しをまとめて重複作成を防ぐ。
let _reconcileInFlight = null;
async function reconcileUid(acc) {
  if (acc && acc.mlUid) return acc;
  if (!_reconcileInFlight) {
    _reconcileInFlight = (async () => {
      let cur = loadAcc() || acc;
      if (cur && cur.mlUid) return cur.mlUid;
      // まず同名の既存ユーザーを探して採用（新しい別人を作らない）
      const existing = await findUserByName(cur.name);
      if (existing) { cur.mlUid = existing; saveAcc(cur); return existing; }
      // 本当に居なければ新規作成
      const { avatar, avatarType } = charAvatar(cur);
      const node = push(ref(db, "users"));
      const uid = node.key;
      try {
        await set(node, {
          name: cur.name, avatar, avatarType, color: "#5b8cff",
          bio: "", bday: cur.bday || "", pwHash: "",
          showcase: showcaseUrls(cur), collection: collectionIds(cur), collectionDupes: collectionDupes(cur),
          online: false, lastSeen: serverTimestamp(), createdAt: serverTimestamp(), source: "xevarion"
        });
      } catch (e) { return null; }
      cur.mlUid = uid; saveAcc(cur);
      return uid;
    })();
  }
  try { await _reconcileInFlight; } catch (e) {} finally { _reconcileInFlight = null; }
  return loadAcc() || acc;
}

// 変更同期: 表示名・アイコン・誕生日・ショーケース・コレクションを Firebase に反映
async function syncProfile(acc) {
  acc = loadAcc() || acc;
  if (!acc || !acc.name) return;
  // mlUid が無い/失われている場合でも、既存の自分を採用して重複ユーザーを作らない
  if (!acc.mlUid) acc = await reconcileUid(acc);
  if (!acc || !acc.mlUid) return;
  const { avatar, avatarType } = charAvatar(acc);
  try {
    await update(ref(db, "users/" + acc.mlUid), {
      name: acc.name, avatar, avatarType, bday: acc.bday || "",
      showcase: showcaseUrls(acc), collection: collectionIds(acc), collectionDupes: collectionDupes(acc)
    });
  } catch (e) {}
}

// MagiLink ユーザーを削除（アカウント削除の同期用）。
//   users/{mlUid} を消し、関連ノード(friends/friendRequests/sentReq)も後始末（権限が無ければ握りつぶす）。
async function deleteUser(mlUid) {
  if (!mlUid) return { error: "nouid" };
  try { await remove(ref(db, "users/" + mlUid)); } catch (e) { return { error: "net" }; }
  for (const path of ["friends/" + mlUid, "friendRequests/" + mlUid, "sentReq/" + mlUid]) {
    try { await remove(ref(db, path)); } catch (e) {}
  }
  return { ok: true };
}

// 表示名から MagiLink ユーザーを削除（一覧＝XEVARION側からの削除・改名同期用）。
//   ・同名レコードが複数あっても全て消して名前を解放する（orphan/重複対策）。
//   ・exceptUid を渡すと、そのレコードだけ残す（改名時に自分の現行レコードを守る用途）。
async function deleteUserByName(name, exceptUid) {
  name = (name || "").trim();
  if (!name) return { ok: true, removed: 0 };
  let uids = [];
  try {
    const snap = await get(query(ref(db, "users"), orderByChild("name"), equalTo(name)));
    snap.forEach((c) => { if (c.key !== exceptUid) uids.push(c.key); });
  } catch (e) {
    try {
      const all = await get(ref(db, "users"));
      all.forEach((c) => { const u = c.val(); if (c.key !== exceptUid && u && (u.name || "").trim() === name) uids.push(c.key); });
    } catch (e2) { return { error: "net" }; }
  }
  if (!uids.length) return { ok: true, removed: 0, notFound: true };
  let removed = 0;
  for (const uid of uids) { const r = await deleteUser(uid); if (r && r.ok) removed++; }
  return { ok: true, removed };
}

window.XEVASync = { isNameTaken, findUserByName, linkAccount, syncProfile, deleteUser, deleteUserByName, ready: true };
try { window.dispatchEvent(new Event("xevasync:ready")); } catch (e) {}
