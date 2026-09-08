/* ══════════════════════════════════════════════════════════════
   Magi: Boccia Rush — プライベートルーム（部屋番号のオンライン対戦）
   ──────────────────────────────────────────────────────────────
   ★ 考えかた
     ボッチャは<b>1投ずつ交代</b>なので、盤面をまるごと送る必要がありません。
     部屋の <b>seed</b> と、投げた<b>角度・強さ・投球ボックス</b>だけを共有すれば、
     両方の端末が<b>同じ物理計算</b>をして同じ盤面になります（決定論ロックステップ）。
     ★ mbr-core.js の乱数は必ず seed つきのものを使っているので、これが成り立ちます。

   ★ 使う DB は MagiBurst と同じ Firebase（プロジェクト magiburst）の RTDB。
     部屋のキーは "BR" ＋ 6文字。MagiBurst の部屋（"B"＋4桁）とはぶつかりません。

   ★ 不正対策（ご指定）
     ・投球は <b>角度・強さ・ボックス</b> だけを送ります。座標や結果は送りません。
       ＝ 受け取った側が自分で計算するので、<b>結果を書きかえることができません</b>。
     ・角度と強さは受け取り側でも 0〜1／-π〜π に丸めます。
     ・順番でない人の投球は<b>捨てます</b>（turn を見て判定）。
   ══════════════════════════════════════════════════════════════ */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getDatabase, ref, set, update, get, onValue, off,
  onDisconnect, remove, push, onChildAdded, runTransaction,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAEobH5IHlUNR3ryHKxsYNgHlIFSzNTJ7M",
  authDomain: "magiburst.firebaseapp.com",
  databaseURL: "https://magiburst-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "magiburst",
  storageBucket: "magiburst.firebasestorage.app",
  messagingSenderId: "107493819618",
  appId: "1:107493819618:web:727adc2ff9fcf00713cabb",
};
let app = null, db = null;
function conn() {
  if (db) return db;
  try {
    app = initializeApp(firebaseConfig, "boccia-online");
  } catch (e) {
    /* すでに同じ名前で作ってあれば、それを使う */
    const found = getApps().find((a) => a.name === "boccia-online");
    app = found || null;
  }
  if (!app) return null;
  db = getDatabase(app);
  return db;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function gen6() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}
const path = (code) => "brrooms/" + code;

let cur = null;      // { code, uid, host, side }
let subs = [];
function stop() { subs.forEach((f) => { try { f(); } catch (e) {} }); subs = []; }

function me() {
  try {
    const a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null");
    return { uid: (a && (a.xvUid || a.uid)) || ("g" + Math.floor(Math.random() * 1e9)),
             name: (a && a.name) || "PLAYER" };
  } catch (e) {
    return { uid: "g" + Math.floor(Math.random() * 1e9), name: "PLAYER" };
  }
}
function myCharId() {
  try {
    const s = JSON.parse(localStorage.getItem("mbr_v1") || "null");
    return (s && s.team && s.team[0]) || "";
  } catch (e) { return ""; }
}

/* ══════════ 部屋を作る ══════════ */
async function create() {
  const d = conn();
  if (!d) return fail();
  const u = me();
  const code = gen6();
  const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
  try {
    await set(ref(d, path(code)), {
      host: u.uid, seed, ends: 6, started: false, at: Date.now(),
      players: { [u.uid]: { name: u.name, side: "red", charId: myCharId(), online: true } },
    });
    onDisconnect(ref(d, path(code) + "/players/" + u.uid + "/online")).set(false);
    cur = { code, uid: u.uid, host: true, side: "red" };
    try { const s = JSON.parse(localStorage.getItem("mbr_v1") || "{}"); s.lastRoom = code;
          localStorage.setItem("mbr_v1", JSON.stringify(s)); } catch (e) {}
    watch();
  } catch (e) { fail(); }
}

/* ══════════ 部屋に入る ══════════ */
async function join(code) {
  const d = conn();
  if (!d) return fail();
  if (!code || code.length < 4) {
    return say("ルームIDを入れてください。", "Enter a room ID.");
  }
  const u = me();
  try {
    const snap = await get(ref(d, path(code)));
    if (!snap.exists()) return say("その部屋は見つかりませんでした。", "Room not found.");
    const room = snap.val();
    const n = Object.keys(room.players || {}).length;
    if (n >= 2 && !(room.players || {})[u.uid]) {
      return say("その部屋はもういっぱいです。", "That room is full.");
    }
    const side = (room.players && room.players[u.uid] && room.players[u.uid].side)
      || (Object.values(room.players || {}).some((p) => p.side === "red") ? "blue" : "red");
    await update(ref(d, path(code) + "/players/" + u.uid),
      { name: u.name, side, charId: myCharId(), online: true });
    onDisconnect(ref(d, path(code) + "/players/" + u.uid + "/online")).set(false);
    cur = { code, uid: u.uid, host: room.host === u.uid, side };
    try { const s = JSON.parse(localStorage.getItem("mbr_v1") || "{}"); s.lastRoom = code;
          localStorage.setItem("mbr_v1", JSON.stringify(s)); } catch (e) {}
    watch();
  } catch (e) { fail(); }
}

/* ══════════ 部屋のようすを見る ══════════ */
function watch() {
  const d = conn(); if (!d || !cur) return;
  stop();
  const r = ref(d, path(cur.code));
  const un = onValue(r, (snap) => {
    const room = snap.val();
    if (!room) { say("部屋が閉じられました。", "The room was closed."); leave(); return; }
    paintRoom(room);
    if (room.started && !window.__brStarted) {
      window.__brStarted = true;
      startOnlineMatch(room);
    }
  });
  subs.push(() => off(r, "value", un));
}
function paintRoom(room) {
  const box = document.getElementById("roomBox");
  if (!box) return;
  const ps = Object.keys(room.players || {}).map((k) => Object.assign({ uid: k }, room.players[k]));
  const red = ps.filter((p) => p.side === "red"), blue = ps.filter((p) => p.side === "blue");
  const en = (document.documentElement.lang === "en");
  const seat = (list, cls, nm) =>
    '<div class="slab tight ' + cls + '" style="flex:1"><b style="font-size:11px;letter-spacing:.12em">' + nm + "</b>"
    + (list.length ? list.map((p) => '<div class="row" style="border:0;padding:5px 0">'
        + '<span style="font-weight:900;font-size:12px">' + (p.name || "?") + "</span>"
        + '<span class="tag" style="margin-left:auto">' + (p.online ? "ONLINE" : "OFFLINE") + "</span></div>").join("")
      : '<div class="note" style="margin-top:5px">' + (en ? "Waiting…" : "待っています…") + "</div>") + "</div>";
  box.innerHTML = '<div class="hd">ROOM</div>'
    + '<div class="slab" style="text-align:center">'
    + '<div class="note">' + (en ? "ROOM ID" : "ルームID") + "</div>"
    + '<div style="font-family:\'Orbitron\',sans-serif;font-weight:900;font-size:30px;letter-spacing:.24em">'
    + cur.code + "</div>"
    + '<button class="b sm gh" style="margin:8px auto 0" onclick="MBROnline.copy()">'
    + (en ? "Copy ID" : "IDをコピー") + "</button></div>"
    + '<div style="display:flex;gap:8px">' + seat(red, "red", "RED") + seat(blue, "", "BLUE") + "</div>"
    + '<div class="brow">'
    + '<button class="b sm" onclick="MBROnline.swap()">' + (en ? "Swap side" : "チームを変える") + "</button>"
    + '<button class="b sm gh" onclick="MBROnline.leave()">' + (en ? "Leave" : "退出") + "</button></div>"
    + (cur.host ? '<button class="b pri" style="margin-top:9px" ' + (ps.length >= 2 ? "" : "disabled")
        + ' onclick="MBROnline.start()">' + (en ? "START" : "はじめる") + "</button>"
      : '<div class="note" style="margin-top:9px;text-align:center">'
        + (en ? "Waiting for the host to start…" : "ホストがはじめるのを待っています…") + "</div>");
}

async function swap() {
  const d = conn(); if (!d || !cur) return;
  cur.side = cur.side === "red" ? "blue" : "red";
  await update(ref(d, path(cur.code) + "/players/" + cur.uid), { side: cur.side });
}
async function start() {
  const d = conn(); if (!d || !cur || !cur.host) return;
  await update(ref(d, path(cur.code)), { started: true, startAt: Date.now() });
}
async function leave() {
  const d = conn();
  if (d && cur) {
    try {
      await remove(ref(d, path(cur.code) + "/players/" + cur.uid));
      if (cur.host) await remove(ref(d, path(cur.code)));
    } catch (e) {}
  }
  stop(); cur = null; window.__brStarted = false;
  const box = document.getElementById("roomBox"); if (box) box.innerHTML = "";
}
function copy() {
  if (!cur) return;
  try { navigator.clipboard.writeText(cur.code); say("コピーしました。", "Copied."); } catch (e) {}
}

/* ══════════ 試合（1投ずつ共有する）══════════ */
function startOnlineMatch(room) {
  const ps = Object.keys(room.players || {}).map((k) => Object.assign({ uid: k }, room.players[k]));
  const red = ps.find((p) => p.side === "red"), blue = ps.find((p) => p.side === "blue");
  window.MBRUI._close();
  window.MBRUI._startOnline({
    kind: "online", difficulty: "normal", ends: room.ends || 6, vs: 1, competition: true,
    online: { code: cur.code, uid: cur.uid, side: cur.side, seed: room.seed,
              red: red ? red.name : "RED", blue: blue ? blue.name : "BLUE" },
  });
  listenShots();
}
function listenShots() {
  const d = conn(); if (!d || !cur) return;
  const r = ref(d, path(cur.code) + "/shots");
  const un = onChildAdded(r, (snap) => {
    const s = snap.val();
    if (!s || s.uid === cur.uid) return;           /* 自分の投球は打った時点で反映ずみ */
    try { window.MBRUI._remoteShot(s); } catch (e) {}
  });
  subs.push(() => off(r, "child_added", un));
}
/* 自分が投げたことを伝える（角度・強さ・ボックスだけ） */
function sendShot(o) {
  const d = conn(); if (!d || !cur) return;
  const ang = Math.max(-Math.PI, Math.min(Math.PI, Number(o.angle) || 0));
  const pw = Math.max(0, Math.min(1, Number(o.power) || 0));
  const slot = Math.max(0, Math.min(5, o.slot | 0));
  push(ref(d, path(cur.code) + "/shots"), {
    uid: cur.uid, side: cur.side, jack: !!o.jack, angle: ang, power: pw, slot, at: Date.now(),
  }).catch(() => {});
}

function say(ja, en) {
  const tx = (document.documentElement.lang === "en") ? en : ja;
  try { window.MBRUI._toast(tx); } catch (e) { alert(tx); }
}
function fail() { say("オンラインに接続できませんでした。電波の良いところでもう一度お試しください。",
                      "Could not connect. Please try again with a better connection."); }

window.MBROnline = { create, join, swap, start, leave, copy, sendShot, get room() { return cur; } };
